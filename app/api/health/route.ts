export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Public health endpoint — returns 200 when DB is reachable, 503 otherwise.
// Safe to expose: no secrets, no PII, no row counts.
export async function GET() {
  const started = Date.now();
  try {
    const supabase = createServiceClient();
    // Cheap round-trip: request one existing table's metadata via HEAD.
    const { error } = await supabase.from("users").select("id", { count: "exact", head: true });
    const ms = Date.now() - started;
    if (error) {
      return NextResponse.json({ ok: false, db: "fail", error: error.message, ms }, { status: 503 });
    }
    return NextResponse.json({ ok: true, db: "ok", ms }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, db: "fail", error: err.message, ms: Date.now() - started }, { status: 503 });
  }
}
