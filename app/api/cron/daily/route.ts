// Combined daily cron endpoint — runs all scheduled tasks in one request.
// This works on Vercel Hobby plan (2 cron jobs / daily only).
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
  return runDaily(request);
}
export async function POST(request: Request) {
  return runDaily(request);
}

async function runDaily(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = { ran_at: new Date().toISOString() };
  const base = process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get("host")}`;
  const secret = process.env.CRON_SECRET || "";

  // Helper to call internal endpoint
  async function call(path: string) {
    try {
      const r = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "user-agent": "vercel-cron" },
      });
      return { ok: r.ok, status: r.status };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  results.archive = await call("/api/events/auto-archive");
  results.reminders = await call("/api/events/auto-reminders");
  results.cleanup = await call("/api/cron/cleanup");

  // Direct inline work (same idea, in-process, faster)
  try {
    const supabase = createServiceClient();
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString();
    const { count } = await supabase
      .from("whatsapp_log")
      .delete({ count: "exact" })
      .lt("created_at", cutoff)
      .neq("status", "failed");
    results.whatsapp_log_purged = count || 0;
  } catch (e: any) {
    results.whatsapp_log_error = e.message;
  }

  return NextResponse.json(results);
}
