import { createServiceClient } from "@/lib/supabase";

// Default templates — all system templates. Used both for seeding new systems AND as "restore default" target.
// Editing in /whatsapp/templates modifies the DB copy; these remain as source-of-truth fallback.
export const DEFAULT_TEMPLATES: Record<string, { body: string; description: string; variables: string[] }> = {
  // === Customer flow ===
  order_created: {
    description: "הודעת אישור הזמנה חדשה ללקוח (נשלח אוטומטית בעת יצירת הזמנה)",
    variables: ["event_name", "order_id", "link"],
    body: "🎉 *ENG TOURS*\nההזמנה שלך התקבלה!\n\nאירוע: *{{event_name}}*\nמספר הזמנה: *#{{order_id}}*\n\nצפייה ופרטים מלאים:\n{{link}}",
  },
  order_details: {
    description: "שליחה ידנית של פרטי הזמנה (אדמין → 'שלח ב-WhatsApp')",
    variables: ["event_name", "link"],
    body: "📋 *ENG TOURS*\nפרטי הזמנה לאירוע: *{{event_name}}*\n\nצפייה והורדת PDF:\n{{link}}",
  },
  order_details_buyers: {
    description: "שליחה לכל הרוכשים בהזמנה (אדמין → 'שלח לרוכשים')",
    variables: ["first_name", "event_name", "link"],
    body: "📋 *ENG TOURS*\nשלום {{first_name}}! פרטי הזמנה לאירוע: *{{event_name}}*\n\nצפייה והורדת PDF:\n{{link}}",
  },
  order_confirmed_customer: {
    description: "נשלח ללקוח אחרי אישור סופי של ההזמנה",
    variables: ["link"],
    body: "הזמנתך אושרה! ראה פרטים: {{link}}",
  },
  order_confirmed_airline: {
    description: "נשלח לנוסעים עם מספר אישור חברת התעופה",
    variables: ["confirmation"],
    body: "אישור הזמנת נוסעים – מספר {{confirmation}}",
  },
  payment_confirmed: {
    description: "אישור תשלום ללקוח",
    variables: ["event_name", "amount", "order_id"],
    body: "✅ *ENG TOURS*\nהתשלום שלך התקבל!\n\nסכום: ₪{{amount}}\nהזמנה: #{{order_id}}\nאירוע: {{event_name}}\n\nתודה!",
  },
  partial_payment: {
    description: "התראה שהזמנה שולמה חלקית",
    variables: ["id"],
    body: "משתתף שילם – הזמנה #{{id}} עדיין לא הושלמה",
  },
  event_reminder: {
    description: "תזכורת N ימים לפני האירוע",
    variables: ["n", "event_name", "link"],
    body: "⏰ *ENG TOURS*\nעוד {{n}} ימים לאירוע *{{event_name}}*!\n\nפרטי הנסיעה:\n{{link}}",
  },
  waiting_list_available: {
    description: "התפנה מקום - הודעה למי שברשימת המתנה",
    variables: ["link"],
    body: "התפנה מקום! הזמן עכשיו: {{link}}",
  },

  // === Supplier flow ===
  supplier_new_order: {
    description: "הודעה לספק על הזמנה חדשה שממתינה לאישור",
    variables: ["order_id", "event_name", "link"],
    body: "🔔 *ENG TOURS - ספקים*\nהזמנה חדשה ממתינה לאישורך\n\nהזמנה: #{{order_id}}\nאירוע: {{event_name}}\n\nלאישור:\n{{link}}",
  },
  order_pending_supplier: {
    description: "הזמנה ממתינה לאישור ספק",
    variables: ["id", "link"],
    body: "הזמנה #{{id}} – ממתינה לאישורך {{link}}",
  },
  supplier_approved: {
    description: "התראה למנהל שספק אישר הזמנה",
    variables: ["name", "id"],
    body: "ספק {{name}} אישר הזמנה #{{id}}",
  },
  supplier_issue: {
    description: "התראה כשספק מדווח על בעיה",
    variables: ["name", "id"],
    body: "ספק {{name}} דיווח על בעיה בהזמנה #{{id}}",
  },

  // === Admin notifications ===
  new_order: {
    description: "התראה למנהל על הזמנה חדשה במערכת",
    variables: ["id", "event_name"],
    body: "הזמנה חדשה #{{id}} לאירוע {{event_name}}",
  },
  low_stock: {
    description: "התראה למנהל על מלאי נמוך",
    variables: ["n", "item_name"],
    body: "נשארו {{n}} מקומות ב-{{item_name}}",
  },
  backup_failed: {
    description: "התרעה שהגיבוי האוטומטי נכשל",
    variables: ["date"],
    body: "גיבוי אוטומטי נכשל – {{date}}",
  },
  "2fa_code": {
    description: "קוד אימות דו-שלבי בהתחברות",
    variables: ["code"],
    body: "קוד האימות שלך: {{code}} – תקף 5 דקות",
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
    .select("body")
    .eq("name", name)
    .single();
  let body = data?.body;
  if (!body) body = DEFAULT_TEMPLATES[name]?.body || "";
  return applyTemplate(body || "", variables);
}

/** Ensures all DEFAULT_TEMPLATES exist in DB. Does not overwrite existing ones. */
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

/** Send WhatsApp template message + log to DB. Non-throwing. */
export async function sendTemplateMessage(templateName: string, toPhone: string, variables: Record<string, any> = {}, context?: { order_id?: string; recipient_type?: string }) {
  try {
    const { wasender, isConfigured } = await import("@/lib/wasender");
    if (!isConfigured() || !toPhone) return { ok: false, reason: "not_configured_or_no_phone" };

    const sr = await wasender.listSessions();
    const sessions: any[] = Array.isArray(sr.data) ? sr.data : ((sr.data as any)?.data || []);
    const session = sessions.find((s) => ["connected", "ready"].includes((s.status || "").toLowerCase()));
    if (!session?.api_key) return { ok: false, reason: "no_connected_session" };

    const text = await renderTemplate(templateName, variables);
    if (!text) return { ok: false, reason: "empty_template" };

    let digits = String(toPhone).replace(/[^0-9]/g, "");
    if (digits.startsWith("0")) digits = "972" + digits.slice(1);
    const to = "+" + digits;

    const r = await wasender.sendTextWithSessionKey(session.api_key, { to, text });

    const supabase = createServiceClient();
    await supabase.from("whatsapp_log").insert({
      direction: "outgoing",
      recipient: to.replace("+", ""),
      recipient_number: to.replace("+", ""),
      recipient_type: context?.recipient_type || null,
      message_body: text,
      template_name: templateName,
      status: r.ok ? "sent" : "failed",
      error_message: r.ok ? null : r.error,
      order_id: context?.order_id || null,
    });

    return { ok: r.ok, msgId: (r.data as any)?.data?.msgId };
  } catch (err: any) {
    console.error(`sendTemplateMessage(${templateName}) error:`, err);
    return { ok: false, error: err.message };
  }
}

/** Get admin phone for admin notifications */
export async function getAdminPhone(): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("users")
    .select("phone")
    .eq("role", "admin")
    .eq("is_active", true)
    .not("phone", "is", null)
    .order("is_primary_admin", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.phone || process.env.ADMIN_PHONE || null;
}

/** Restore ALL templates to their DEFAULT values (overwrites DB copies). */
export async function resetAllTemplatesToDefault() {
  const supabase = createServiceClient();
  let count = 0;
  for (const [name, cfg] of Object.entries(DEFAULT_TEMPLATES)) {
    const { data: existing } = await supabase.from("whatsapp_templates").select("id").eq("name", name).maybeSingle();
    if (existing) {
      await supabase.from("whatsapp_templates").update({ body: cfg.body, variables: cfg.variables }).eq("id", existing.id);
    } else {
      await supabase.from("whatsapp_templates").insert({ name, body: cfg.body, variables: cfg.variables, is_active: true });
    }
    count++;
  }
  return count;
}
