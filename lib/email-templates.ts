import { createServiceClient } from "@/lib/supabase";

// Default email templates. HTML wrapper is applied separately.
export const DEFAULT_EMAIL_TEMPLATES: Record<string, { subject: string; body_html: string; description: string; variables: string[] }> = {
  order_created: {
    description: "אישור הזמנה חדשה ללקוח (נשלח אוטומטית עם יצירת הזמנה)",
    variables: ["event_name", "order_id", "link"],
    subject: "אישור הזמנה - {{event_name}}",
    body_html: `<h2>🎉 ההזמנה שלך התקבלה!</h2>
<p>שלום,</p>
<p>ההזמנה שלך לאירוע <strong>{{event_name}}</strong> נוצרה בהצלחה.</p>
<p><b>מספר הזמנה:</b> #{{order_id}}</p>
<p><a href="{{link}}" class="btn">📄 הורד פרטי הזמנה (PDF)</a></p>
<p>תודה שבחרת ב-ENG TOURS!</p>`,
  },
  order_details: {
    description: "שליחת פרטי הזמנה מלאים (אדמין → 'שלח במייל')",
    variables: ["event_name", "link"],
    subject: "פרטי הזמנה - {{event_name}}",
    body_html: `<h2>📋 פרטי הזמנה</h2>
<p>שלום,</p>
<p>מצורפים פרטי ההזמנה שלך לאירוע <strong>{{event_name}}</strong>.</p>
<p><a href="{{link}}" class="btn">📄 הורד PDF של פרטי ההזמנה</a></p>
<p style="color:#6b7280;font-size:13px">או העתק את הקישור הבא: {{link}}</p>`,
  },
  order_details_buyers: {
    description: "שליחה לכל הרוכשים בהזמנה",
    variables: ["first_name", "event_name", "link"],
    subject: "פרטי הזמנה - {{event_name}}",
    body_html: `<h2>📋 פרטי הזמנה</h2>
<p>שלום {{first_name}},</p>
<p>מצורפים פרטי ההזמנה שלך לאירוע <strong>{{event_name}}</strong>.</p>
<p><a href="{{link}}" class="btn">📄 הורד PDF</a></p>`,
  },
  payment_confirmed: {
    description: "אישור תשלום ללקוח",
    variables: ["event_name", "amount", "order_id"],
    subject: "אישור תשלום - {{event_name}}",
    body_html: `<h2>✅ התשלום שלך התקבל!</h2>
<p><b>סכום:</b> ₪{{amount}}</p>
<p><b>הזמנה:</b> #{{order_id}}</p>
<p><b>אירוע:</b> {{event_name}}</p>
<p>תודה!</p>`,
  },
  partial_payment: {
    description: "תשלום חלקי - יש יתרה לשלם",
    variables: ["event_name", "paid", "remaining", "order_id", "link"],
    subject: "תשלום חלקי - {{event_name}}",
    body_html: `<h2>💰 תשלום חלקי התקבל</h2>
<p>שולם: <b>₪{{paid}}</b></p>
<p>נותר לתשלום: <b style="color:#f59e0b">₪{{remaining}}</b></p>
<p><b>הזמנה:</b> #{{order_id}}</p>
<p><a href="{{link}}" class="btn">🔗 השלם תשלום</a></p>`,
  },
  order_confirmed_customer: {
    description: "אישור סופי ללקוח (status=confirmed)",
    variables: ["event_name", "link"],
    subject: "ההזמנה שלך אושרה - {{event_name}}",
    body_html: `<h2>✅ ההזמנה אושרה!</h2>
<p>ההזמנה שלך לאירוע <strong>{{event_name}}</strong> אושרה סופית.</p>
<p>כל פרטי הנסיעה כאן:</p>
<p><a href="{{link}}" class="btn">📄 הורד PDF</a></p>`,
  },
  event_reminder: {
    description: "תזכורת לפני אירוע (N ימים לפני)",
    variables: ["n", "event_name", "link"],
    subject: "תזכורת - {{event_name}} בעוד {{n}} ימים",
    body_html: `<h2>⏰ עוד {{n}} ימים לאירוע!</h2>
<p>שלום,</p>
<p>נותרו {{n}} ימים ל-<strong>{{event_name}}</strong>. זה הזמן לבדוק את פרטי הנסיעה:</p>
<p><a href="{{link}}" class="btn">📄 פרטי הנסיעה</a></p>`,
  },
  supplier_new_order: {
    description: "הודעה לספק על הזמנה חדשה ממתינה לאישור",
    variables: ["order_id", "event_name", "link"],
    subject: "🔔 הזמנה חדשה ממתינה לאישורך - #{{order_id}}",
    body_html: `<h2>🔔 הזמנה חדשה ממתינה לאישור</h2>
<p><b>הזמנה:</b> #{{order_id}}</p>
<p><b>אירוע:</b> {{event_name}}</p>
<p><a href="{{link}}" class="btn">👉 פתח את פורטל הספקים</a></p>`,
  },
  "2fa_code": {
    description: "קוד אימות דו-שלבי בהתחברות",
    variables: ["code"],
    subject: "קוד אימות - ENG TOURS",
    body_html: `<h2>🔐 קוד אימות</h2>
<p>הקוד שלך להתחברות:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#DD9933;text-align:center;padding:16px;background:#fef3c7;border-radius:8px">{{code}}</p>
<p style="color:#6b7280;font-size:13px">תקף 5 דקות. אל תשתף עם אף אחד.</p>`,
  },
};

async function getCompanyInfo() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("system_settings").select("key, value").in("key",
    ["company_name", "company_tagline", "company_phone", "company_email", "company_website", "company_address"]
  );
  const info: Record<string, string> = {};
  for (const row of data || []) info[row.key] = row.value || "";
  return info;
}

async function renderHtml(subject: string, body: string, recipientEmail?: string): Promise<string> {
  const info = await getCompanyInfo();
  const name = info.company_name || "ENG TOURS";
  const tagline = info.company_tagline || "";
  const year = new Date().getFullYear();
  const footerParts: string[] = [];
  if (info.company_phone) footerParts.push(`📞 ${info.company_phone}`);
  if (info.company_email) footerParts.push(`📧 <a href="mailto:${info.company_email}" style="color:#fbbf24;text-decoration:none">${info.company_email}</a>`);
  if (info.company_website) footerParts.push(`🌐 <a href="${info.company_website}" style="color:#fbbf24;text-decoration:none">${info.company_website.replace(/^https?:\/\//, "")}</a>`);
  const footerLine = footerParts.join(" · ");

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#fff8ed;font-family:-apple-system,BlinkMacSystemFont,'Heebo',Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid #f3e8ff">
      <div style="background:linear-gradient(135deg,#DD9933 0%,#b87a1f 100%);padding:24px;text-align:center">
        <h1 style="margin:0;color:white;font-size:28px;letter-spacing:1px">${name}</h1>
        ${tagline ? `<p style="margin:6px 0 0;color:white;opacity:0.92;font-size:13px">${tagline}</p>` : ""}
      </div>
      <div style="padding:24px;color:#374151;line-height:1.6">
        <style>.btn{display:inline-block;background:#DD9933;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:500;margin:8px 0}.btn:hover{background:#b87a1f}h2{color:#1f2937;margin-top:0}</style>
        ${body}
      </div>
      <div style="background:#1f2937;padding:20px;text-align:center;color:#9ca3af;font-size:12px;line-height:1.8">
        ${footerLine ? `<div>${footerLine}</div>` : ""}
        ${info.company_address ? `<div style="margin-top:4px">${info.company_address}</div>` : ""}
        <div style="margin-top:8px">© ${year} ${name} · כל הזכויות שמורות</div>
        ${recipientEmail ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #374151;font-size:11px"><a href="${info.company_website || "https://eng-tours.vercel.app"}/unsubscribe?email=${encodeURIComponent(recipientEmail)}&token=${(await import("@/lib/unsubscribe-token")).signEmailToken(recipientEmail)}" style="color:#6b7280;text-decoration:underline">הסר אותי מרשימת התפוצה</a></div>` : ""}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function applyTemplate(text: string, vars: Record<string, any> = {}) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? "" : String(v);
  });
}

export async function renderEmailTemplate(name: string, variables: Record<string, any> = {}, recipientEmail?: string): Promise<{ subject: string; html: string } | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("email_templates")
    .select("subject, body_html, is_active")
    .eq("name", name)
    .single();
  if (data && data.is_active === false) return null;
  const tpl = data?.subject ? { subject: data.subject, body: data.body_html } : (DEFAULT_EMAIL_TEMPLATES[name] ? { subject: DEFAULT_EMAIL_TEMPLATES[name].subject, body: DEFAULT_EMAIL_TEMPLATES[name].body_html } : null);
  if (!tpl) return null;
  const subject = applyTemplate(tpl.subject, variables);
  const body = applyTemplate(tpl.body, variables);
  return { subject, html: await renderHtml(subject, body, recipientEmail) };
}

export async function isUnsubscribed(email: string): Promise<boolean> {
  if (!email) return false;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("email_unsubscribes")
    .select("email")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  return !!data;
}

export async function ensureDefaultEmailTemplates() {
  const supabase = createServiceClient();
  const { data: existing } = await supabase.from("email_templates").select("name");
  const existingNames = new Set((existing || []).map((t: any) => t.name));
  const toInsert = Object.entries(DEFAULT_EMAIL_TEMPLATES)
    .filter(([name]) => !existingNames.has(name))
    .map(([name, cfg]) => ({
      name, subject: cfg.subject, body_html: cfg.body_html, variables: cfg.variables, is_active: true,
    }));
  if (toInsert.length > 0) await supabase.from("email_templates").insert(toInsert);
  return toInsert.length;
}

export async function resetAllEmailTemplatesToDefault() {
  const supabase = createServiceClient();
  let count = 0;
  for (const [name, cfg] of Object.entries(DEFAULT_EMAIL_TEMPLATES)) {
    const { data: existing } = await supabase.from("email_templates").select("id").eq("name", name).maybeSingle();
    if (existing) {
      await supabase.from("email_templates").update({ subject: cfg.subject, body_html: cfg.body_html, variables: cfg.variables, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("email_templates").insert({ name, subject: cfg.subject, body_html: cfg.body_html, variables: cfg.variables, is_active: true });
    }
    count++;
  }
  return count;
}

export { renderHtml };
