import { createServiceClient } from "@/lib/supabase";

// Default templates used as fallback if DB doesn't have them
export const DEFAULT_TEMPLATES: Record<string, { body: string; description: string; variables: string[] }> = {
  order_created: {
    description: "הודעת אישור הזמנה חדשה ללקוח",
    variables: ["event_name", "order_id", "link"],
    body: "🎉 *ENG TOURS*\nההזמנה שלך התקבלה!\n\nאירוע: *{{event_name}}*\nמספר הזמנה: *#{{order_id}}*\n\nצפייה ופרטים מלאים:\n{{link}}",
  },
  order_details: {
    description: "שליחת פרטי הזמנה מלאים",
    variables: ["event_name", "link"],
    body: "📋 *ENG TOURS*\nפרטי הזמנה לאירוע: *{{event_name}}*\n\nצפייה והורדת PDF:\n{{link}}",
  },
  order_details_buyers: {
    description: "פרטי הזמנה לכל הרוכשים",
    variables: ["first_name", "event_name", "link"],
    body: "📋 *ENG TOURS*\nשלום {{first_name}}! פרטי הזמנה לאירוע: *{{event_name}}*\n\nצפייה והורדת PDF:\n{{link}}",
  },
  supplier_new_order: {
    description: "הודעה לספק על הזמנה חדשה",
    variables: ["order_id", "event_name", "link"],
    body: "🔔 *ENG TOURS - ספקים*\nהזמנה חדשה ממתינה לאישורך\n\nהזמנה: #{{order_id}}\nאירוע: {{event_name}}\n\nלאישור:\n{{link}}",
  },
  payment_confirmed: {
    description: "אישור תשלום ללקוח",
    variables: ["event_name", "amount", "order_id"],
    body: "✅ *ENG TOURS*\nהתשלום שלך התקבל!\n\nסכום: ₪{{amount}}\nהזמנה: #{{order_id}}\nאירוע: {{event_name}}\n\nתודה!",
  },
  event_reminder: {
    description: "תזכורת לפני אירוע",
    variables: ["n", "event_name", "link"],
    body: "⏰ *ENG TOURS*\nעוד {{n}} ימים לאירוע *{{event_name}}*!\n\nפרטי הנסיעה:\n{{link}}",
  },
};

export function applyTemplate(body: string, variables: Record<string, string | number | undefined | null> = {}) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = variables[k];
    return v == null ? "" : String(v);
  });
}

export async function renderTemplate(name: string, variables: Record<string, string | number | undefined | null> = {}): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("whatsapp_templates")
    .select("body, is_active")
    .eq("name", name)
    .single();
  let body = data?.body;
  if (!body) {
    body = DEFAULT_TEMPLATES[name]?.body || "";
  }
  return applyTemplate(body || "", variables);
}

export async function ensureDefaultTemplates() {
  const supabase = createServiceClient();
  const { data: existing } = await supabase.from("whatsapp_templates").select("name");
  const existingNames = new Set((existing || []).map((t: any) => t.name));
  const toInsert = Object.entries(DEFAULT_TEMPLATES)
    .filter(([name]) => !existingNames.has(name))
    .map(([name, cfg]) => ({
      name,
      body: cfg.body,
      variables: cfg.variables,
      is_active: true,
    }));
  if (toInsert.length > 0) {
    await supabase.from("whatsapp_templates").insert(toInsert);
  }
  return toInsert.length;
}
