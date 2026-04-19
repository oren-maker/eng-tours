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

  // Backup (if enabled in system_settings)
  try {
    const supabase = createServiceClient();
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "backup_enabled")
      .maybeSingle();
    const enabled = setting?.value === true || setting?.value === "true";
    if (enabled) {
      const { runBackup } = await import("@/lib/backup");
      const r = await runBackup("auto");
      results.backup = { ok: true, ...r };
    } else {
      results.backup = { skipped: "disabled" };
    }
  } catch (e: any) {
    results.backup = { ok: false, error: e.message };
  }

  // Backup integrity check — read back the latest backup, confirm it parses as JSON
  try {
    const supabase = createServiceClient();
    const { data: latest } = await supabase
      .from("backups")
      .select("id, storage_path, tables_count, total_rows")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.storage_path) {
      const { data: blob } = await supabase.storage.from("backups").download(latest.storage_path);
      if (!blob) throw new Error("download returned null");
      const text = await blob.text();
      const parsed = JSON.parse(text);
      const tableCount = parsed && typeof parsed === "object" ? Object.keys(parsed.tables || parsed).length : 0;
      const ok = tableCount > 0 && (!latest.tables_count || tableCount === latest.tables_count);
      results.backup_integrity = { ok, backup_id: latest.id, tables_found: tableCount, tables_expected: latest.tables_count };
      if (!ok) {
        await supabase.from("audit_log").insert({
          action: "backup_integrity_fail",
          entity_type: "backup",
          entity_id: latest.id,
          after_data: { tables_found: tableCount, tables_expected: latest.tables_count } as any,
          created_at: new Date().toISOString(),
        });
      }
    } else {
      results.backup_integrity = { skipped: "no backup yet" };
    }
  } catch (e: any) {
    results.backup_integrity = { ok: false, error: e.message };
  }

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
