export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { data: b } = await supabase.from("backups").select("storage_path").eq("id", params.id).single();
  if (b?.storage_path) await supabase.storage.from("backups").remove([b.storage_path]);
  const { error } = await supabase.from("backups").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
