export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { runBackup } from "@/lib/backup";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("backups")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ backups: data || [] });
}

export async function POST() {
  try {
    const result = await runBackup("manual");
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Backup failed" }, { status: 500 });
  }
}
