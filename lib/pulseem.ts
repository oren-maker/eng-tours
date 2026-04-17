import { createServiceClient } from "./supabase";

// Direct Send API (transactional, single recipient) — NOT the UI/campaign API
const BASE = "https://api.pulseem.com";
const API_KEY = process.env.PULSEEM_API_KEY || "";
const DEFAULT_SENDER = process.env.PULSEEM_SENDER || "ENGtours";

interface SmsSendOptions {
  order_id?: string;
  recipient_type?: "customer" | "supplier" | "admin" | "test";
  sender?: string;
  reference?: string;
}

interface SmsSendResult {
  success: boolean;
  sendId?: string;
  messageStatus?: string;
  error?: string;
  raw?: any;
}

function normalizePhone(phone: string): string {
  let p = (phone || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+972")) p = "0" + p.slice(4);
  if (p.startsWith("972") && !p.startsWith("0")) p = "0" + p.slice(3);
  return p;
}

async function callSendSms(sendId: string, sender: string, phone: string, text: string) {
  try {
    const res = await fetch(`${BASE}/api/v1/SmsApi/SendSms`, {
      method: "POST",
      headers: { "APIKey": API_KEY, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        sendId,
        isAsync: false,
        smsSendData: {
          fromNumber: sender,
          toNumberList: [phone],
          textList: [text],
          referenceList: [sendId],
        },
      }),
    });
    const raw = await res.json();
    const ok = raw?.status === "Success" && raw?.success >= 1;
    const itemMsg = raw?.items?.[0]?.message;
    const httpStatus = res.status;
    return { ok, raw, httpStatus, error: ok ? undefined : (raw?.error || itemMsg || "Send failed"), messageStatus: itemMsg };
  } catch (e: any) {
    return { ok: false, raw: { error: e.message }, httpStatus: 0, error: e.message, messageStatus: undefined };
  }
}

export async function sendSms(to: string, text: string, options: SmsSendOptions = {}): Promise<SmsSendResult> {
  const sender = options.sender || DEFAULT_SENDER;
  const phone = normalizePhone(to);
  const sendId = options.reference || `sms-${Date.now()}`;
  const sb = createServiceClient();

  // First attempt
  let attempt = await callSendSms(sendId, sender, phone, text);

  // Retry once after 6s on transient failures (5xx / network / 429)
  const transient = !attempt.ok && (attempt.httpStatus === 0 || attempt.httpStatus === 429 || (attempt.httpStatus >= 500 && attempt.httpStatus < 600));
  let retried = false;
  let firstError: string | undefined;
  if (transient) {
    firstError = attempt.error;
    try {
      await sb.from("sms_log").insert({
        recipient_number: phone,
        recipient_type: options.recipient_type || null,
        sender,
        message_body: text,
        status: "failed",
        error: `${firstError} · retrying in 6s`,
        order_id: options.order_id || null,
        raw: attempt.raw,
      });
    } catch {}
    await new Promise((r) => setTimeout(r, 6000));
    attempt = await callSendSms(`${sendId}-retry`, sender, phone, text);
    retried = true;
  }

  // Final log row
  try {
    await sb.from("sms_log").insert({
      recipient_number: phone,
      recipient_type: options.recipient_type || null,
      sender,
      message_body: text,
      status: attempt.ok ? "sent" : "failed",
      error: attempt.ok ? (retried ? "sent on retry" : null) : attempt.error,
      order_id: options.order_id || null,
      raw: attempt.raw,
    });
  } catch (e) { console.error("sms_log insert failed:", e); }

  return { success: attempt.ok, sendId, messageStatus: attempt.messageStatus, error: attempt.error, raw: attempt.raw };
}

export async function checkConnection(): Promise<{ ok: boolean; accountName?: string; error?: string }> {
  // Use the UI API's CheckConnection since the direct-send API doesn't expose it.
  try {
    const res = await fetch(`https://ui-api.pulseem.com/api/v1/AccountsApi/CheckConnection`, {
      headers: { APIKey: API_KEY },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, accountName: data.accountName };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
