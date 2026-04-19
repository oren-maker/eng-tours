export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const supabase = createServiceClient();
  const { data: b } = await supabase.from("backups").select("storage_path, created_at").eq("id", params.id).single();
  if (b?.storage_path) await supabase.storage.from("backups").remove([b.storage_path]);
  const { error } = await supabase.from("backups").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAction(session?.user?.id ?? null, "backup_deleted", "backup", params.id, b ?? undefined, null);
  return NextResponse.json({ ok: true });
}
