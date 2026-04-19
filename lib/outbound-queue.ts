import { createServiceClient } from "@/lib/supabase";

type Channel = "whatsapp" | "sms" | "email";

export interface EnqueueParams {
  channel: Channel;
  recipient: string;
  templateName?: string | null;
  payload: Record<string, any>;
  order_id?: string | null;
  recipient_type?: string | null;
  delaySeconds?: number;
}

/** Add a message to the outbound queue. Returns the inserted row id. */
export async function enqueueOutbound(params: EnqueueParams): Promise<string | null> {
  const supabase = createServiceClient();
  const scheduled_for = new Date(Date.now() + (params.delaySeconds || 0) * 1000).toISOString();
  const { data, error } = await supabase
    .from("outbound_queue")
    .insert({
      channel: params.channel,
      recipient: params.recipient,
      template_name: params.templateName ?? null,
      payload: params.payload,
      order_id: params.order_id ?? null,
      recipient_type: params.recipient_type ?? null,
      scheduled_for,
    })
    .select("id")
    .single();
  if (error) {
    console.error("enqueue failed:", error);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Process up to `batchSize` due messages. Each attempt goes through the
 * same transport as the synchronous send path, so failures get persisted
 * error reasons and incrementing attempt counts. Exponential backoff on
 * failure (2^attempt minutes, capped 60). Terminal after max_attempts.
 */
export async function processQueue(batchSize = 20): Promise<{ processed: number; sent: number; failed: number; retrying: number }> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Pick pending jobs due now
  const { data: jobs } = await supabase
    .from("outbound_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(batchSize);

  if (!jobs || jobs.length === 0) {
    return { processed: 0, sent: 0, failed: 0, retrying: 0 };
  }

  let sent = 0, failed = 0, retrying = 0;

  for (const job of jobs) {
    // Claim the job
    const { error: claimErr } = await supabase
      .from("outbound_queue")
      .update({ status: "sending", attempt_count: (job.attempt_count || 0) + 1 })
      .eq("id", job.id)
      .eq("status", "pending");
    if (claimErr) continue;

    let ok = false;
    let errMsg: string | null = null;

    try {
      if (job.channel === "whatsapp") {
        const { wasender, isConfigured } = await import("@/lib/wasender");
        if (!isConfigured()) throw new Error("wasender not configured");
        const sessionsRes = await wasender.listSessions();
        const sessions: any[] = Array.isArray(sessionsRes.data) ? sessionsRes.data : ((sessionsRes.data as any)?.data || []);
        const session = sessions.find((s) => ["connected", "ready"].includes((s.status || "").toLowerCase()));
        if (!session?.api_key) throw new Error("no connected session");
        const r = await wasender.sendTextWithSessionKey(session.api_key, { to: job.recipient, text: job.payload.text });
        if (!r.ok) throw new Error(r.error || "send failed");
        ok = true;
      } else if (job.channel === "sms") {
        const { sendSms } = await import("@/lib/pulseem");
        const r = await sendSms(job.recipient, job.payload.text, {
          order_id: job.order_id || undefined,
          recipient_type: (job.recipient_type as any) || "customer",
        });
        if (!r.success) throw new Error(r.error || "send failed");
        ok = true;
      } else if (job.channel === "email") {
        const { sendEmail } = await import("@/lib/email");
        const r = await sendEmail(job.recipient, job.payload.subject, job.payload.html, {
          template: job.template_name || undefined,
          order_id: job.order_id || undefined,
        });
        if (!r.success) throw new Error(r.error || "send failed");
        ok = true;
      }
    } catch (e: any) {
      errMsg = e.message || String(e);
    }

    const attempt = (job.attempt_count || 0) + 1;
    if (ok) {
      await supabase.from("outbound_queue").update({ status: "sent", sent_at: now, last_error: null }).eq("id", job.id);
      sent++;
    } else if (attempt >= (job.max_attempts || 3)) {
      await supabase.from("outbound_queue").update({ status: "failed", last_error: errMsg }).eq("id", job.id);
      failed++;
    } else {
      const backoffMinutes = Math.min(60, Math.pow(2, attempt));
      const next = new Date(Date.now() + backoffMinutes * 60_000).toISOString();
      await supabase.from("outbound_queue").update({ status: "pending", scheduled_for: next, last_error: errMsg }).eq("id", job.id);
      retrying++;
    }
  }

  return { processed: jobs.length, sent, failed, retrying };
}
