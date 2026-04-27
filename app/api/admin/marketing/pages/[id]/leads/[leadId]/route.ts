export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function PATCH(request: NextRequest, { params }: { params: { id: string; leadId: string } }) {
  const supabase = createServiceClient();
  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if ("handled" in body) {
    update.handled = !!body.handled;
    update.handled_at = body.handled ? new Date().toISOString() : null;
  }
  if ("archive" in body) {
    update.archived_at = body.archive ? new Date().toISOString() : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "אין שדה לעדכון" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("marketing_leads")
    .update(update)
    .eq("id", params.leadId)
    .eq("page_id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; leadId: string } }) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("marketing_leads")
    .delete()
    .eq("id", params.leadId)
    .eq("page_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
