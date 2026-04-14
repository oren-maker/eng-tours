const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
const { Client } = require('pg');

const DEFAULTS = {
  order_created: {
    subject: "אישור הזמנה - {{event_name}}",
    body_html: `<h2>🎉 ההזמנה שלך התקבלה!</h2>
<p>שלום,</p>
<p>ההזמנה שלך לאירוע <strong>{{event_name}}</strong> נוצרה בהצלחה.</p>
<p><b>מספר הזמנה:</b> #{{order_id}}</p>
<p><a href="{{link}}" class="btn">📄 הורד פרטי הזמנה (PDF)</a></p>
<p>תודה שבחרת ב-ENG TOURS!</p>`,
    variables: ["event_name", "order_id", "link"],
  },
  order_details: {
    subject: "פרטי הזמנה - {{event_name}}",
    body_html: `<h2>📋 פרטי הזמנה</h2>
<p>שלום,</p>
<p>מצורפים פרטי ההזמנה שלך לאירוע <strong>{{event_name}}</strong>.</p>
<p><a href="{{link}}" class="btn">📄 הורד PDF של פרטי ההזמנה</a></p>
<p style="color:#6b7280;font-size:13px">או העתק את הקישור הבא: {{link}}</p>`,
    variables: ["event_name", "link"],
  },
  order_details_buyers: {
    subject: "פרטי הזמנה - {{event_name}}",
    body_html: `<h2>📋 פרטי הזמנה</h2><p>שלום {{first_name}},</p><p>מצורפים פרטי ההזמנה שלך לאירוע <strong>{{event_name}}</strong>.</p><p><a href="{{link}}" class="btn">📄 הורד PDF</a></p>`,
    variables: ["first_name", "event_name", "link"],
  },
  payment_confirmed: {
    subject: "אישור תשלום - {{event_name}}",
    body_html: `<h2>✅ התשלום שלך התקבל!</h2><p><b>סכום:</b> ₪{{amount}}</p><p><b>הזמנה:</b> #{{order_id}}</p><p><b>אירוע:</b> {{event_name}}</p><p>תודה!</p>`,
    variables: ["event_name", "amount", "order_id"],
  },
  partial_payment: {
    subject: "תשלום חלקי - {{event_name}}",
    body_html: `<h2>💰 תשלום חלקי התקבל</h2><p>שולם: <b>₪{{paid}}</b></p><p>נותר לתשלום: <b style="color:#f59e0b">₪{{remaining}}</b></p><p><b>הזמנה:</b> #{{order_id}}</p><p><a href="{{link}}" class="btn">🔗 השלם תשלום</a></p>`,
    variables: ["event_name", "paid", "remaining", "order_id", "link"],
  },
  order_confirmed_customer: {
    subject: "ההזמנה שלך אושרה - {{event_name}}",
    body_html: `<h2>✅ ההזמנה אושרה!</h2><p>ההזמנה שלך לאירוע <strong>{{event_name}}</strong> אושרה סופית.</p><p><a href="{{link}}" class="btn">📄 הורד PDF</a></p>`,
    variables: ["event_name", "link"],
  },
  event_reminder: {
    subject: "תזכורת - {{event_name}} בעוד {{n}} ימים",
    body_html: `<h2>⏰ עוד {{n}} ימים לאירוע!</h2><p>שלום,</p><p>נותרו {{n}} ימים ל-<strong>{{event_name}}</strong>.</p><p><a href="{{link}}" class="btn">📄 פרטי הנסיעה</a></p>`,
    variables: ["n", "event_name", "link"],
  },
  supplier_new_order: {
    subject: "🔔 הזמנה חדשה ממתינה לאישורך - #{{order_id}}",
    body_html: `<h2>🔔 הזמנה חדשה ממתינה לאישור</h2><p><b>הזמנה:</b> #{{order_id}}</p><p><b>אירוע:</b> {{event_name}}</p><p><a href="{{link}}" class="btn">👉 פתח את פורטל הספקים</a></p>`,
    variables: ["order_id", "event_name", "link"],
  },
  "2fa_code": {
    subject: "קוד אימות - ENG TOURS",
    body_html: `<h2>🔐 קוד אימות</h2><p>הקוד שלך להתחברות:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#DD9933;text-align:center;padding:16px;background:#fef3c7;border-radius:8px">{{code}}</p><p style="color:#6b7280;font-size:13px">תקף 5 דקות.</p>`,
    variables: ["code"],
  },
};

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  let added = 0;
  for (const [name, d] of Object.entries(DEFAULTS)) {
    const r = await c.query("SELECT id FROM email_templates WHERE name=$1", [name]);
    if (r.rows.length > 0) continue;
    await c.query(
      "INSERT INTO email_templates (name, subject, body_html, variables, is_active) VALUES ($1, $2, $3, $4, true)",
      [name, d.subject, d.body_html, d.variables]
    );
    added++;
  }
  console.log('added:', added);
  await c.end();
})();
