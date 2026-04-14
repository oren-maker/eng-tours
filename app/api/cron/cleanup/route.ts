export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { isAuthorizedCron } from "@/lib/cron-auth";

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const now = new Date();
  const cutoff90 = new Date(now.getTime() - 90 * 24 * 60 * 60_000).toISOString();
  const cutoff180 = new Date(now.getTime() - 180 * 24 * 60 * 60_000).toISOString();
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60_000).toISOString();

  const results: Record<string, number> = {};

  // WhatsApp logs — keep 90 days, except errors
  const { count: waDeleted } = await supabase
    .from("whatsapp_log")
    .delete({ count: "exact" })
    .lt("created_at", cutoff90)
    .neq("status", "failed");
  results.whatsapp_log_deleted = waDeleted || 0;

  // Health check logs (system direction) — keep 30 days
  const { count: healthDeleted } = await supabase
    .from("whatsapp_log")
    .delete({ count: "exact" })
    .eq("direction", "system")
    .lt("created_at", cutoff30);
  results.health_checks_deleted = healthDeleted || 0;

  // Expired OTP codes — delete after 24h
  const cutoff1d = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  const { count: otpDeleted } = await supabase
    .from("otp_codes")
    .delete({ count: "exact" })
    .lt("created_at", cutoff1d);
  results.otp_codes_deleted = otpDeleted || 0;

  // Audit log — archive entries older than 180 days (not delete — just flag)
  // For now just count them for reporting
  const { count: oldAudit } = await supabase
    .from("audit_log")
    .select("*", { count: "exact", head: true })
    .lt("created_at", cutoff180);
  results.old_audit_entries_count = oldAudit || 0;

  // Abandoned draft orders older than 7 days
  const cutoff7 = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString();
  const { count: draftsDeleted } = await supabase
    .from("orders")
    .delete({ count: "exact" })
    .eq("status", "draft")
    .lt("created_at", cutoff7);
  results.abandoned_drafts_deleted = draftsDeleted || 0;

  return NextResponse.json({ success: true, ran_at: now.toISOString(), ...results });
}
