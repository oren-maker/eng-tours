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

export async function sendSms(to: string, text: string, options: SmsSendOptions = {}): Promise<SmsSendResult> {
  const sender = options.sender || DEFAULT_SENDER;
  const phone = normalizePhone(to);
  const sendId = options.reference || `sms-${Date.now()}`;
  let status: "sent" | "failed" = "failed";
  let error: string | undefined;
  let messageStatus: string | undefined;
  let raw: any = null;

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
    raw = await res.json();
    messageStatus = raw?.items?.[0]?.message;
    if (raw?.status === "Success" && raw?.success >= 1) {
      status = "sent";
    } else {
      error = raw?.error || raw?.items?.[0]?.message || "Send failed";
    }
  } catch (e: any) {
    error = e.message;
  }

  // Log to sms_log (best-effort)
  try {
    const sb = createServiceClient();
    await sb.from("sms_log").insert({
      recipient_number: phone,
      recipient_type: options.recipient_type || null,
      sender,
      message_body: text,
      status,
      error: error || null,
      campaign_id: null,
      order_id: options.order_id || null,
      raw,
    });
  } catch (e) { console.error("sms_log insert failed:", e); }

  return { success: status === "sent", sendId, messageStatus, error, raw };
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
