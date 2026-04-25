export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const editableFields = [
  "title", "slug", "html", "is_active",
  "main_artist", "guest_artist", "event_date",
  "city", "country", "venue_name",
  "ticket_purchase_link", "intro_text",
  "cover_image_url", "wa_message_template",
] as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("marketing_pages")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json({ page: data });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const k of editableFields) {
    if (k in body) {
      const v = body[k];
      if (k === "is_active") update[k] = !!v;
      else if (k === "event_date") update[k] = v || null;
      else if (k === "html") update[k] = typeof v === "string" ? v : "";
      else if (k === "title" || k === "slug") update[k] = typeof v === "string" ? v.trim() : v;
      else if (typeof v === "string") update[k] = v.trim() || null;
      else update[k] = v;
    }
  }
  if (typeof update.title === "string") update.title = (update.title as string) || null;
  if (update.title === null) return NextResponse.json({ error: "כותרת חובה" }, { status: 400 });

  if (update.slug) {
    const { data: clash } = await supabase
      .from("marketing_pages")
      .select("id")
      .eq("slug", update.slug as string)
      .neq("id", params.id)
      .maybeSingle();
    if (clash) return NextResponse.json({ error: "ה-slug כבר תפוס" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("marketing_pages")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("marketing_pages").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
