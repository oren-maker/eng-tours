import { createServiceClient } from "@/lib/supabase";
import { wasender, isConfigured } from "@/lib/wasender";

const RATE_LIMIT_MS = 10_000;

interface QueueLeadNotification {
  recipient: string;
  text: string;
}

/**
 * Schedules an admin lead-alert WA so that consecutive admin notifications
 * are at least 10s apart. Reads the current latest pending/scheduled admin
 * job and pushes the new one after it. This protects the WA account from
 * being blocked when 100 leads come in within seconds.
 */
export async function queueAdminLeadAlert(params: QueueLeadNotification): Promise<{ id: string | null; scheduledFor: string }> {
  const supabase = createServiceClient();

  const { data: tail } = await supabase
    .from("outbound_queue")
    .select("scheduled_for")
    .eq("channel", "whatsapp")
    .eq("recipient_type", "admin")
    .in("status", ["pending", "sending"])
    .order("scheduled_for", { ascending: false })
    .limit(1);

  const lastMs = tail?.[0]?.scheduled_for ? new Date(tail[0].scheduled_for).getTime() : 0;
  const earliestMs = Math.max(Date.now(), lastMs + RATE_LIMIT_MS);
  const scheduledFor = new Date(earliestMs).toISOString();

  const { data, error } = await supabase
    .from("outbound_queue")
    .insert({
      channel: "whatsapp",
      recipient: params.recipient,
      template_name: "marketing_lead_alert",
      payload: { text: params.text },
      recipient_type: "admin",
      scheduled_for: scheduledFor,
    })
    .select("id")
    .single();

  if (error) {
    console.error("queueAdminLeadAlert insert failed:", error);
    return { id: null, scheduledFor };
  }
  return { id: data?.id ?? null, scheduledFor };
}

/**
 * Best-effort drain: if there is exactly one due job and no backlog, send
 * synchronously so admins get notified within seconds for low-traffic pages.
 * For bursts the cron will catch up.
 */
export async function drainOneDueAdminAlert(): Promise<{ sent: boolean; reason?: string }> {
  if (!isConfigured()) return { sent: false, reason: "wasender not configured" };
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: jobs } = await supabase
    .from("outbound_queue")
    .select("*")
    .eq("status", "pending")
    .eq("channel", "whatsapp")
    .eq("recipient_type", "admin")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(1);

  if (!jobs || jobs.length === 0) return { sent: false, reason: "no due jobs" };
  const job = jobs[0];

  const { error: claimErr } = await supabase
    .from("outbound_queue")
    .update({ status: "sending", attempt_count: (job.attempt_count || 0) + 1 })
    .eq("id", job.id)
    .eq("status", "pending");
  if (claimErr) return { sent: false, reason: "claim failed" };

  const sessionsRes = await wasender.listSessions();
  const sessions: any[] = Array.isArray(sessionsRes.data) ? sessionsRes.data : ((sessionsRes.data as any)?.data || []);
  const session = sessions.find((s) => ["connected", "ready"].includes((s.status || "").toLowerCase()));
  if (!session?.api_key) {
    await supabase.from("outbound_queue").update({ status: "pending", last_error: "no connected session" }).eq("id", job.id);
    return { sent: false, reason: "no connected session" };
  }

  const text: string = job.payload?.text || "";
  const r = await wasender.sendTextWithSessionKey(session.api_key, { to: job.recipient, text });

  if (r.ok) {
    await supabase
      .from("outbound_queue")
      .update({ status: "sent", sent_at: now })
      .eq("id", job.id);
    await supabase.from("whatsapp_log").insert({
      direction: "outgoing",
      recipient: job.recipient.replace("+", ""),
      message_body: text,
      template_name: "marketing_lead_alert",
      status: "sent",
      external_id: ((r as any)?.data as any)?.data?.msgId?.toString() || null,
    });
    return { sent: true };
  }

  const attempt = (job.attempt_count || 0) + 1;
  if (attempt >= (job.max_attempts || 3)) {
    await supabase
      .from("outbound_queue")
      .update({ status: "failed", last_error: r.error || null })
      .eq("id", job.id);
    await supabase.from("whatsapp_log").insert({
      direction: "outgoing",
      recipient: job.recipient.replace("+", ""),
      message_body: text,
      template_name: "marketing_lead_alert",
      status: "failed",
      error_message: r.error || null,
    });
  } else {
    const nextMs = Date.now() + Math.min(60, Math.pow(2, attempt)) * 60_000;
    await supabase
      .from("outbound_queue")
      .update({ status: "pending", scheduled_for: new Date(nextMs).toISOString(), last_error: r.error || null })
      .eq("id", job.id);
  }
  return { sent: false, reason: r.error || "send failed" };
}

export function formatLeadAlertText(params: {
  pageTitle: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  interestType: string;
  affiliateName: string | null;
}): string {
  const interestLabel = params.interestType === "ticket_purchase" ? "🎫 רכישת כרטיס" : "📦 חבילה";
  const source = params.affiliateName ? `🔗 ${params.affiliateName}` : "ישיר (ללא קישור)";
  return [
    `🔔 ליד חדש — ${params.pageTitle}`,
    "",
    `שם: ${params.firstName} ${params.lastName}`,
    `טלפון: ${params.phone}`,
    `מייל: ${params.email}`,
    `מתעניין ב: ${interestLabel}`,
    `מקור: ${source}`,
    "",
    `${new Date().toLocaleString("he-IL")}`,
  ].join("\n");
}
