import { createServiceClient } from "@/lib/supabase";
import { logAction } from "@/lib/audit";

const WESENDER_API_URL = process.env.WESENDER_API_URL || "https://api.wesender.co.il/v2";
const WESENDER_API_KEY = process.env.WESENDER_API_KEY || "";
const WESENDER_DEVICE_ID = process.env.WESENDER_DEVICE_ID || "";

interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a WhatsApp message via WeSender API
 */
export async function sendWhatsApp(
  number: string,
  templateName: string,
  variables: Record<string, string> = {},
  options: { order_id?: string; recipient_type?: "customer" | "admin" | "supplier" } = {}
): Promise<SendWhatsAppResult> {
  const supabase = createServiceClient();
  const startTime = new Date().toISOString();

  // Fetch template from DB
  const { data: template } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("name", templateName)
    .single();

  // Build message body from template
  let messageBody = template?.body || templateName;
  for (const [key, value] of Object.entries(variables)) {
    messageBody = messageBody.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  // Normalize phone number (ensure starts with 972)
  const normalizedNumber = normalizePhone(number);

  try {
    const response = await fetch(`${WESENDER_API_URL}/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WESENDER_API_KEY}`,
      },
      body: JSON.stringify({
        device_id: WESENDER_DEVICE_ID,
        phone: normalizedNumber,
        message: messageBody,
      }),
    });

    const data = await response.json();

    // Log the message to whatsapp_log
    await logMessage({
      direction: "outgoing",
      recipient: normalizedNumber,
      recipient_type: options.recipient_type || "customer",
      template_name: templateName,
      message_body: messageBody,
      status: response.ok ? "sent" : "failed",
      external_id: data?.id || data?.message_id || null,
      error_message: response.ok ? null : (data?.error || "Unknown error"),
      raw_payload: data,
      order_id: options.order_id || null,
    });

    // Also log to audit_log for comprehensive tracking on order
    try {
      await logAction(null, "whatsapp_sent", options.order_id ? "order" : "whatsapp", options.order_id, undefined, {
        recipient: normalizedNumber,
        recipient_type: options.recipient_type || "customer",
        template: templateName,
        message_body: messageBody,
        variables,
        status: response.ok ? "sent" : "failed",
        message_id: data?.id || null,
        error: response.ok ? null : (data?.error || "Unknown error"),
        sent_at: startTime,
      });
    } catch { /* audit failure should not fail send */ }

    if (!response.ok) {
      console.error("WeSender send error:", data);
      return { success: false, error: data?.error || "Send failed" };
    }

    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error("WeSender request error:", err);

    await logMessage({
      direction: "outgoing",
      recipient: normalizedNumber,
      recipient_type: options.recipient_type || "customer",
      template_name: templateName,
      message_body: messageBody,
      status: "failed",
      external_id: null,
      error_message: err.message || "Network error",
      raw_payload: { error: err.message },
      order_id: options.order_id || null,
    });

    try {
      await logAction(null, "whatsapp_sent", options.order_id ? "order" : "whatsapp", options.order_id, undefined, {
        recipient: normalizedNumber,
        template: templateName,
        message_body: messageBody,
        status: "failed",
        error: err.message || "Network error",
        sent_at: startTime,
      });
    } catch { /* ignore */ }

    return { success: false, error: err.message };
  }
}

/**
 * Check WeSender SIM health status
 */
export async function checkHealth(): Promise<{
  online: boolean;
  device_name?: string;
  phone_number?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${WESENDER_API_URL}/devices/${WESENDER_DEVICE_ID}`, {
      headers: {
        Authorization: `Bearer ${WESENDER_API_KEY}`,
      },
    });

    if (!response.ok) {
      return { online: false, error: "Failed to check device status" };
    }

    const data = await response.json();
    return {
      online: data?.status === "connected",
      device_name: data?.name,
      phone_number: data?.phone,
    };
  } catch (err: any) {
    return { online: false, error: err.message };
  }
}

// ----- Helpers -----

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "972" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("972")) {
    cleaned = "972" + cleaned;
  }
  return cleaned;
}

async function logMessage(log: {
  direction: "incoming" | "outgoing";
  recipient: string;
  recipient_type: string;
  template_name: string | null;
  message_body: string;
  status: "sent" | "delivered" | "read" | "failed";
  external_id: string | null;
  error_message: string | null;
  raw_payload?: any;
  order_id?: string | null;
}) {
  try {
    const supabase = createServiceClient();
    await supabase.from("whatsapp_log").insert({
      direction: log.direction === "outgoing" ? "outbound" : log.direction,
      recipient: log.recipient,
      recipient_number: log.recipient,
      recipient_type: log.recipient_type,
      template_name: log.template_name,
      message_body: log.message_body,
      status: log.status,
      external_id: log.external_id,
      error_message: log.error_message,
      raw_payload: log.raw_payload || null,
      order_id: log.order_id || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to log WhatsApp message:", err);
  }
}
