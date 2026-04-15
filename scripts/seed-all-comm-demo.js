// Seeds realistic demo entries in email_log + whatsapp_log + sms_log for a single demo order,
// so the admin can visually inspect how each channel is logged.
// Recipients: emails -> oren@bin.co.il, phone -> 0524802830

const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }

const DEMO_ORDER = '83ed84c7-31bb-4a34-971b-527426da262f';
const TEST_EMAIL = 'oren@bin.co.il';
const TEST_PHONE = '0524802830';
const TEST_SUPPLIER_PHONE = '0524802830';

const SAMPLE_VARS = {
  order_created: { event_name: "פסטיבל איי יוון", order_id: "A1B2C3D4", link: "https://eng-tours.vercel.app/p/abc-123", n: "3", amount: "5,000", id: "A1B2C3D4" },
  order_details: { event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" },
  order_details_buyers: { first_name: "אורן", event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" },
  payment_confirmed: { event_name: "פסטיבל איי יוון", amount: "5,000", order_id: "A1B2C3D4" },
  partial_payment: { event_name: "פסטיבל איי יוון", paid: "2,000", remaining: "3,000", order_id: "A1B2C3D4", link: "https://eng-tours.vercel.app/p/abc-123", id: "A1B2C3D4" },
  order_confirmed_customer: { event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" },
  event_reminder: { n: "7", event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" },
  supplier_new_order: { order_id: "A1B2C3D4", event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/supplier/order/abc", id: "A1B2C3D4" },
  "2fa_code": { code: "482691" },
  new_order: { id: "A1B2C3D4", event_name: "פסטיבל איי יוון" },
  order_confirmed_airline: { confirmation: "EL-9423" },
  order_pending_supplier: { id: "A1B2C3D4", link: "https://eng-tours.vercel.app/portal" },
  supplier_approved: { name: "Hotel Athens", id: "A1B2C3D4" },
  supplier_issue: { name: "Hotel Athens", id: "A1B2C3D4" },
  low_stock: { n: "3", item_name: "טיסה TLV→ATH" },
};

function applyVars(s, vars) {
  return (s || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars?.[k] != null ? String(vars[k]) : `{{${k}}}`));
}

function wrapEmail(subject, body) {
  return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><style>
body{font-family:Heebo,Arial,sans-serif;background:#f3f4f6;margin:0;padding:32px 16px;direction:rtl}
.w{max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.h{background:#0369A1;color:#fff;padding:24px;text-align:center;font-size:22px;font-weight:700}
.b{padding:32px 24px;color:#374151;line-height:1.7}
.f{padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;text-align:center;border-top:1px solid #e5e7eb}
.unsub{color:#9ca3af;text-decoration:underline;font-size:11px}
</style></head><body><div class="w">
<div class="h">ENG TOURS</div>
<div class="b">${body}</div>
<div class="f">
  <div>📞 03-1234567 · 📧 info@eng-tours.com · 🌐 eng-tours.com</div>
  <div style="margin-top:8px">© 2026 ENG TOURS · כל הזכויות שמורות</div>
  <div style="margin-top:8px"><a href="#" class="unsub">להסרה מרשימת התפוצה</a></div>
</div>
</div></body></html>`;
}

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Wipe prior demo rows for this order for a clean slate
  await c.query(`DELETE FROM email_log WHERE order_id=$1`, [DEMO_ORDER]);
  await c.query(`DELETE FROM whatsapp_log WHERE order_id=$1`, [DEMO_ORDER]);
  await c.query(`DELETE FROM sms_log WHERE order_id=$1`, [DEMO_ORDER]);

  // 1. EMAIL — all 9 templates, tagged to order
  const emailTpls = (await c.query(`SELECT name, subject, body_html FROM email_templates ORDER BY name`)).rows;
  let idx = 0;
  for (const t of emailTpls) {
    const vars = SAMPLE_VARS[t.name] || {};
    const subject = applyVars(t.subject, vars);
    const body = wrapEmail(subject, applyVars(t.body_html, vars));
    const type = t.name === 'supplier_new_order' ? 'supplier' : (t.name === '2fa_code' ? 'admin' : 'customer');
    const to = type === 'supplier' ? 'supplier@hotel-athens.com' : TEST_EMAIL;
    await c.query(
      `INSERT INTO email_log (recipient_email, recipient_type, template_name, subject, body_html, status, order_id, created_at, message_id)
       VALUES ($1,$2,$3,$4,$5,'sent',$6, now() - (interval '1 minute' * $7), $8)`,
      [to, type, t.name, subject, body, DEMO_ORDER, 10 * (idx + 1), `re_${Math.random().toString(36).slice(2, 14)}`]
    );
    idx++;
  }
  // Add one failed email demo
  await c.query(
    `INSERT INTO email_log (recipient_email, recipient_type, template_name, subject, body_html, status, error, order_id, created_at)
     VALUES ('bounce@invalid.zzz','customer','order_details','פרטי הזמנה - פסטיבל איי יוון', '<html><body>bounced</body></html>','failed','Mailbox does not exist',$1, now() - interval '5 minutes')`,
    [DEMO_ORDER]
  );

  // 2. WHATSAPP — all templates from whatsapp_templates
  const waTpls = (await c.query(`SELECT name, body FROM whatsapp_templates WHERE is_active IS NOT false ORDER BY name`)).rows;
  // mix statuses so UI shows all states
  const waStatuses = ['read', 'read', 'delivered', 'read', 'delivered', 'sent', 'read', 'delivered', 'read', 'failed', 'delivered', 'read', 'sent', 'read', 'delivered'];
  let wi = 0;
  for (const t of waTpls) {
    const vars = SAMPLE_VARS[t.name] || {};
    const body = applyVars(t.body, vars);
    const isSupplier = /supplier|pending_supplier|approved|issue|airline|new_order|low_stock/.test(t.name);
    const recipientType = isSupplier ? 'supplier' : (t.name === '2fa_code' ? 'admin' : 'customer');
    const phone = recipientType === 'supplier' ? TEST_SUPPLIER_PHONE : TEST_PHONE;
    const status = waStatuses[wi % waStatuses.length];
    await c.query(
      `INSERT INTO whatsapp_log (direction, recipient_type, recipient_number, template_name, message_body, status, order_id, created_at)
       VALUES ('outbound', $1, $2, $3, $4, $5, $6, now() - (interval '1 minute' * $7))`,
      [recipientType, phone, t.name, body, status, DEMO_ORDER, 8 * (wi + 1) + 5]
    );
    wi++;
  }

  // 3. SMS — five transactional variants, all routed to 0524802830
  const smsVariants = [
    { template: 'order_created', text: 'ENG TOURS: ההזמנה שלך #A1B2C3D4 לפסטיבל איי יוון התקבלה. פרטים: https://eng-tours.vercel.app/p/abc-123', type: 'customer', ago: 120, status: 'read' },
    { template: 'payment_confirmed', text: 'ENG TOURS: תשלום של 5,000 ש"ח התקבל להזמנה #A1B2C3D4. תודה!', type: 'customer', ago: 80, status: 'read' },
    { template: 'partial_payment', text: 'ENG TOURS: התקבל תשלום חלקי. נותרו 3,000 ש"ח לתשלום: https://eng-tours.vercel.app/pay/xyz', type: 'customer', ago: 55, status: 'delivered' },
    { template: 'event_reminder', text: 'ENG TOURS: תזכורת – האירוע שלך בעוד 7 ימים. פרטי טיסה: https://eng-tours.vercel.app/p/abc-123', type: 'customer', ago: 40, status: 'delivered' },
    { template: 'supplier_new_order', text: 'ENG TOURS: הזמנה חדשה #A1B2C3D4 ממתינה לאישורך. כניסה: https://eng-tours.vercel.app/portal', type: 'supplier', ago: 25, status: 'read' },
    { template: '2fa_code', text: 'ENG TOURS: קוד אימות 482691. תקף 5 דקות.', type: 'admin', ago: 10, status: 'sent' },
  ];
  for (const s of smsVariants) {
    await c.query(
      `INSERT INTO sms_log (recipient_number, recipient_type, sender, message_body, status, order_id, created_at, raw)
       VALUES ($1, $2, 'ENGtours', $3, $4, $5, now() - (interval '1 minute' * $6), $7::jsonb)`,
      [TEST_PHONE, s.type, s.text, s.status, DEMO_ORDER, s.ago, JSON.stringify({ sendId: `demo-${s.template}`, status: 'Success', success: 1, items: [{ toNumber: TEST_PHONE, message: 'SUCCESS' }] })]
    );
  }
  // One failed SMS for realism
  await c.query(
    `INSERT INTO sms_log (recipient_number, recipient_type, sender, message_body, status, error, order_id, created_at)
     VALUES ('0501234567','customer','ENGtours','שליחה שנכשלה','failed','No valid recipients found',$1, now() - interval '3 minutes')`,
    [DEMO_ORDER]
  );

  // Summary
  const e = (await c.query(`SELECT count(*) FROM email_log WHERE order_id=$1`, [DEMO_ORDER])).rows[0].count;
  const w = (await c.query(`SELECT count(*) FROM whatsapp_log WHERE order_id=$1`, [DEMO_ORDER])).rows[0].count;
  const s = (await c.query(`SELECT count(*) FROM sms_log WHERE order_id=$1`, [DEMO_ORDER])).rows[0].count;
  console.log(`seeded → email_log:${e}  whatsapp_log:${w}  sms_log:${s}  (order ${DEMO_ORDER})`);
  await c.end();
})();
