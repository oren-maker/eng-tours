const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Pick a real order so the panel shows something
  const { rows: orderRows } = await c.query(`SELECT id FROM orders ORDER BY created_at DESC LIMIT 1`);
  const orderId = orderRows[0]?.id || null;
  console.log('demo order:', orderId);

  // Pick a participant email from that order for unsub banner demo
  let participantEmail = null;
  if (orderId) {
    const { rows: pr } = await c.query(`SELECT email FROM participants WHERE order_id=$1 AND email IS NOT NULL LIMIT 1`, [orderId]);
    participantEmail = pr[0]?.email || null;
  }
  console.log('participant email:', participantEmail);

  // 1) email_log demo rows (spread templates, statuses, types)
  const emailSeed = [
    { to: participantEmail || 'dana.cohen@gmail.com', template: 'order_created', subject: 'אישור הזמנה פסטיבל איי יוון', type: 'customer', status: 'sent', order: orderId, mins: 5 },
    { to: participantEmail || 'dana.cohen@gmail.com', template: 'payment_confirmed', subject: 'אישור תשלום פסטיבל איי יוון', type: 'customer', status: 'sent', order: orderId, mins: 40 },
    { to: 'supplier@hotel-athens.com', template: 'supplier_new_order', subject: 'הזמנה חדשה לספק', type: 'supplier', status: 'sent', order: orderId, mins: 90 },
    { to: 'yossi.levi@walla.co.il', template: 'event_reminder', subject: 'תזכורת: פסטיבל איי יוון', type: 'customer', status: 'sent', order: null, mins: 180 },
    { to: 'noa.azulay@icloud.com', template: 'partial_payment', subject: 'תשלום חלקי', type: 'customer', status: 'sent', order: null, mins: 260 },
    { to: 'bad-address@nowhere.xyz', template: 'order_details', subject: 'פרטי הזמנה', type: 'customer', status: 'failed', order: null, mins: 320, error: 'The email address is not valid.' },
    { to: 'oren@bin.co.il', template: '2fa_code', subject: 'קוד אימות - ENG TOURS', type: 'admin', status: 'sent', order: null, mins: 400 },
    { to: 'ron.katz@hotmail.com', template: 'marketing_newsletter', subject: 'ניוזלטר אפריל', type: 'marketing', status: 'sent', order: null, mins: 600 },
    { to: 'oren@bin.co.il', template: 'order_created', subject: '[בדיקה] אישור הזמנה', type: 'test', status: 'sent', order: null, mins: 720 },
  ];

  const sampleHtml = (s, body) => `
<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><style>body{font-family:Heebo,sans-serif;background:#f3f4f6;margin:0;padding:32px}
.c{max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden}
.h{background:#0369A1;color:#fff;padding:24px;text-align:center;font-size:20px;font-weight:700}
.b{padding:24px;color:#374151;line-height:1.6}.f{padding:16px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center}</style></head>
<body><div class="c"><div class="h">ENG TOURS</div><div class="b"><h2>${s}</h2>${body}</div><div class="f">ENG TOURS &copy; 2026 · 03-1234567 · info@eng-tours.com</div></div></body></html>`;

  for (const e of emailSeed) {
    const ts = new Date(Date.now() - e.mins * 60_000).toISOString();
    await c.query(
      `INSERT INTO email_log (recipient_email, recipient_type, template_name, subject, body_html, status, error, order_id, created_at, message_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        e.to, e.type, e.template, e.subject,
        sampleHtml(e.subject, `<p>שלום,</p><p>זוהי דוגמה לתבנית <code>${e.template}</code>.</p><p>נמען: ${e.to}</p>`),
        e.status, e.error || null, e.order, ts,
        e.status === 'sent' ? `re_${Math.random().toString(36).slice(2, 14)}` : null,
      ]
    );
  }

  // 2) email_unsubscribe_log demo (including one resub by admin)
  const { rows: adminRows } = await c.query(`SELECT id FROM users WHERE role='admin' LIMIT 1`);
  const adminId = adminRows[0]?.id || null;

  await c.query(`INSERT INTO email_unsubscribe_log (email, event_type, reason, source, created_at) VALUES
    ('yossi.levi@walla.co.il','unsubscribed','too_many_emails','unsubscribe_link', now()-interval '20 days'),
    ('yossi.levi@walla.co.il','resubscribed',null,'admin', now()-interval '2 days'),
    ('noa.azulay@icloud.com','unsubscribed','not_relevant','unsubscribe_link', now()-interval '7 days'),
    ('shira.green@gmail.com','unsubscribed','never_signed_up','unsubscribe_link', now()-interval '30 days'),
    ('ron.katz@hotmail.com','unsubscribed','too_many_emails','unsubscribe_link', now()-interval '14 days')
    ON CONFLICT DO NOTHING`);

  if (adminId) {
    await c.query(`UPDATE email_unsubscribe_log SET actor_user_id=$1 WHERE event_type='resubscribed' AND actor_user_id IS NULL`, [adminId]);
  }

  // 3) Ensure the demo order has an unsubbed participant (for banner demo)
  if (participantEmail) {
    await c.query(
      `INSERT INTO email_unsubscribes (email, reason, unsubscribed_at, source)
       VALUES ($1,'too_many_emails', now()-interval '3 days','unsubscribe_link')
       ON CONFLICT (email) DO UPDATE SET unsubscribed_at=EXCLUDED.unsubscribed_at, reason=EXCLUDED.reason`,
      [participantEmail.toLowerCase().trim()]
    );
    await c.query(
      `INSERT INTO email_unsubscribe_log (email,event_type,reason,source,created_at)
       VALUES ($1,'unsubscribed','too_many_emails','unsubscribe_link', now()-interval '3 days')`,
      [participantEmail.toLowerCase().trim()]
    );
  }

  // Report
  const r1 = await c.query(`SELECT count(*) FROM email_log`);
  const r2 = await c.query(`SELECT count(*) FROM email_unsubscribe_log`);
  const r3 = await c.query(`SELECT count(*) FROM email_unsubscribes`);
  console.log(`email_log: ${r1.rows[0].count} | unsub_log: ${r2.rows[0].count} | active unsubs: ${r3.rows[0].count}`);
  console.log(`demo_order_id: ${orderId}`);
  await c.end();
})();
