import { createServiceClient } from "./supabase";

const BASE = "https://ui-api.pulseem.com";
const API_KEY = process.env.PULSEEM_API_KEY || "";
const DEFAULT_SENDER = process.env.PULSEEM_SENDER || "ENG";

interface PulseemResponse {
  error?: string;
  data?: any;
  sessionId?: string;
  status?: string;
  message?: string;
}

interface SmsSendOptions {
  order_id?: string;
  recipient_type?: "customer" | "supplier" | "admin" | "test";
  sender?: string;
}

interface SmsSendResult {
  success: boolean;
  campaignId?: number;
  error?: string;
  pendingSenderApproval?: boolean;
  raw?: any;
}

function normalizePhone(phone: string): string {
  // Keep digits + plus. Israeli numbers: accept 05X... or +9725X...
  let p = (phone || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+972")) p = "0" + p.slice(4);
  return p;
}

async function call(path: string, body: any): Promise<PulseemResponse> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "APIKey": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return data as PulseemResponse;
}

export async function sendSms(to: string, text: string, options: SmsSendOptions = {}): Promise<SmsSendResult> {
  const sender = options.sender || DEFAULT_SENDER;
  const phone = normalizePhone(to);
  let status: "sent" | "failed" = "failed";
  let error: string | undefined;
  let campaignId: number | undefined;
  let pendingSenderApproval = false;
  let rawCreate: PulseemResponse = {};
  let rawSend: PulseemResponse | undefined;

  try {
    // 1. Create campaign
    rawCreate = await call("/api/v1/SmsCampaignApi/CreateSmsCampaign", {
      name: `tx-${Date.now()}`,
      fromNumber: sender,
      text,
    });

    if (rawCreate.status === "Error" || rawCreate.error !== "0") {
      if (rawCreate.error === "7") pendingSenderApproval = true;
      error = rawCreate.message || `CreateSmsCampaign error ${rawCreate.error}`;
    } else {
      campaignId = rawCreate.data?.campaignId || rawCreate.data?.smsCampaignID || rawCreate.data?.id || rawCreate.data;

      // 2. Send campaign to recipient
      if (campaignId) {
        rawSend = await call("/api/v1/SmsCampaignApi/SendSmsCampaign", {
          smsCampaignID: Number(campaignId),
          isTest: false,
          sendingDetails: [{ cellphone: phone }],
        });
        if (rawSend.status === "Error" || rawSend.error !== "0") {
          error = rawSend.message || `SendSmsCampaign error ${rawSend.error}`;
        } else {
          status = "sent";
        }
      } else {
        error = "CreateSmsCampaign returned no campaign id";
      }
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
      campaign_id: campaignId || null,
      order_id: options.order_id || null,
      raw: { create: rawCreate, send: rawSend },
    });
  } catch (e) { console.error("sms_log insert failed:", e); }

  return { success: status === "sent", campaignId, error, pendingSenderApproval, raw: { create: rawCreate, send: rawSend } };
}

export async function checkConnection(): Promise<{ ok: boolean; accountName?: string; error?: string }> {
  try {
    const res = await fetch(`${BASE}/api/v1/AccountsApi/CheckConnection`, { headers: { APIKey: API_KEY } });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, accountName: data.accountName };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
