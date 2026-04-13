export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { wasender, isConfigured } from "@/lib/wasender";
import { createServiceClient } from "@/lib/supabase";

async function logHealth(payload: {
  online: boolean;
  sessions?: number;
  error?: string;
  detail?: any;
  manual?: boolean;
}) {
  try {
    const supabase = createServiceClient();
    const summary = payload.online
      ? `✓ בריאות תקינה (${payload.sessions ?? 0} חשבונות מחוברים)`
      : `✗ חיבור נכשל${payload.error ? ": " + payload.error : ""}`;
    await supabase.from("whatsapp_log").insert({
      direction: "system",
      recipient: "health-check",
      recipient_type: "system",
      template_name: payload.manual ? "health_check_manual" : "health_check_auto",
      message_body: summary,
      status: payload.online ? "delivered" : "failed",
      error_message: payload.error || null,
    });
    // Also save last_check timestamp + result in system_settings
    const settingsValue = JSON.stringify({
      online: payload.online,
      sessions: payload.sessions ?? 0,
      checked_at: new Date().toISOString(),
      error: payload.error || null,
      manual: !!payload.manual,
    });
    await supabase.from("system_settings").upsert(
      { key: "wasender_last_health", value: settingsValue, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch (e) {
    // Silent — don't fail the health check on logging error
    console.error("logHealth error", e);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const manual = url.searchParams.get("manual") === "1";
  const result = await runCheck();
  await logHealth({ ...result, manual });
  return NextResponse.json({ ...result, checked_at: new Date().toISOString() });
}

async function runCheck() {
  if (!isConfigured()) {
    return { online: false, error: "Not configured" };
  }
  const r = await wasender.listSessions();
  if (!r.ok) return { online: false, error: r.error };
  const data: any = r.data;
  const sessions = Array.isArray(data) ? data : (data?.data || []);
  const connected = sessions.some((s: any) => {
    const st = (s.status || "").toLowerCase();
    return st === "connected" || st === "ready";
  });
  return { online: connected, sessions: sessions.length };
}
