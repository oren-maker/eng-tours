import { createServiceClient } from "./supabase";
import { sendSms } from "./pulseem";
import { sendEmail } from "./email";
import { renderEmailTemplate } from "./email-templates";
import { sendWhatsApp } from "./wesender";

type Channel = "whatsapp" | "sms" | "email";

export interface NotifyRecipient {
  phone?: string | null;
  email?: string | null;
}

export interface NotifyOptions {
  order_id?: string;
  recipient_type?: "customer" | "supplier" | "admin";
  /** Override channels (otherwise uses template config) */
  forceChannels?: Channel[];
}

export interface NotifyChannelResult {
  channel: Channel;
  sent: boolean;
  error?: string;
}

export interface NotifyResult {
  template: string;
  channelsTried: Channel[];
  results: NotifyChannelResult[];
}

/** Look up a template's configured channels from whatsapp_templates.channels */
async function getTemplateChannels(templateName: string): Promise<Channel[]> {
  try {
    const sb = createServiceClient();
    const { data } = await sb
      .from("whatsapp_templates")
      .select("channels, is_active")
      .eq("name", templateName)
      .maybeSingle();
    if (!data || (data as any).is_active === false) return [];
    const channels = (data as any).channels;
    if (!Array.isArray(channels) || channels.length === 0) return ["whatsapp"];
    return channels.filter((c: string) => ["whatsapp", "sms", "email"].includes(c)) as Channel[];
  } catch {
    return ["whatsapp"];
  }
}

/** Apply {{var}} placeholders to a string */
function applyVars(s: string, vars: Record<string, any>) {
  return (s || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars?.[k] != null ? String(vars[k]) : `{{${k}}}`));
}

/**
 * Main entry: dispatch a notification to the configured channels for this template.
 * Templates live in `whatsapp_templates` (for whatsapp + sms body) and `email_templates` (for email body).
 * Which channels fire is determined by `whatsapp_templates.channels` (or `forceChannels`).
 */
export async function sendNotification(
  templateName: string,
  recipient: NotifyRecipient,
  vars: Record<string, any> = {},
  options: NotifyOptions = {}
): Promise<NotifyResult> {
  const channels = options.forceChannels || (await getTemplateChannels(templateName));
  const results: NotifyChannelResult[] = [];

  if (channels.length === 0) {
    return { template: templateName, channelsTried: [], results: [] };
  }

  const sb = createServiceClient();

  // Preload WA/SMS body (shared template) and email body/subject
  const { data: waRow } = await sb
    .from("whatsapp_templates")
    .select("body")
    .eq("name", templateName)
    .maybeSingle();
  const waSmsBody = waRow ? applyVars((waRow as any).body, vars) : "";

  // WhatsApp — uses wa-templates body
  if (channels.includes("whatsapp")) {
    if (!recipient.phone) {
      results.push({ channel: "whatsapp", sent: false, error: "missing phone" });
    } else {
      try {
        const r = await sendWhatsApp(recipient.phone, templateName, vars as Record<string, string>, {
          recipient_type: options.recipient_type || "customer",
          order_id: options.order_id,
        });
        results.push({ channel: "whatsapp", sent: r.success, error: r.error });
      } catch (e: any) {
        results.push({ channel: "whatsapp", sent: false, error: e.message });
      }
    }
  }

  // SMS — reuse the WA/SMS template body (plain text)
  if (channels.includes("sms")) {
    if (!recipient.phone) {
      results.push({ channel: "sms", sent: false, error: "missing phone" });
    } else if (!waSmsBody) {
      results.push({ channel: "sms", sent: false, error: "template body missing" });
    } else {
      try {
        const r = await sendSms(recipient.phone, waSmsBody, {
          recipient_type: options.recipient_type === "supplier" ? "supplier" : options.recipient_type === "admin" ? "admin" : "customer",
          order_id: options.order_id,
          reference: `${templateName}-${Date.now()}`,
        });
        results.push({ channel: "sms", sent: r.success, error: r.error });
      } catch (e: any) {
        results.push({ channel: "sms", sent: false, error: e.message });
      }
    }
  }

  // Email — uses email_templates (separate HTML template) if present
  if (channels.includes("email")) {
    if (!recipient.email) {
      results.push({ channel: "email", sent: false, error: "missing email" });
    } else {
      try {
        const rendered = await renderEmailTemplate(templateName, vars, recipient.email);
        if (!rendered) {
          results.push({ channel: "email", sent: false, error: "email template missing or inactive" });
        } else {
          const r = await sendEmail(recipient.email, rendered.subject, rendered.html, {
            template: templateName,
            recipient_type: options.recipient_type === "supplier" ? "supplier" : options.recipient_type === "admin" ? "admin" : "customer",
            order_id: options.order_id,
            prerendered: true,
            variables: vars as any,
          });
          results.push({ channel: "email", sent: r.success, error: r.error });
        }
      } catch (e: any) {
        results.push({ channel: "email", sent: false, error: e.message });
      }
    }
  }

  return { template: templateName, channelsTried: channels, results };
}
