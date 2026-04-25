export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { data: page } = await supabase
    .from("marketing_pages")
    .select("archived_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!page) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const archived_at = page.archived_at ? null : new Date().toISOString();
  const { error } = await supabase
    .from("marketing_pages")
    .update({ archived_at, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, archived: !!archived_at });
}
