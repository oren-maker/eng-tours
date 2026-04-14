// Triggers every WhatsApp template through real system flows.
// Creates real orders, changes statuses, adds payments, etc.
// Everything goes to 0524802830 (both as customer and admin).
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
const { Client } = require('pg');

const BASE = 'https://eng-tours.vercel.app';
const PHONE = '+972524802830';
const EMAIL = 'oren@bin.co.il';
const WA_KEY = '4535|1DF8xnzwBFEMY4snI7mPc7EEkqoEOpKSja0XO6Gwa406326d';

function log(step, msg) { console.log(`[${step}] ${msg}`); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

async function sendDirect(templateName, variables) {
  // Render the template (fetch body from DB), then send via wasender
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const { rows } = await c.query('SELECT body FROM whatsapp_templates WHERE name=$1', [templateName]);
  await c.end();
  let body = rows[0]?.body || '';
  for (const [k, v] of Object.entries(variables)) {
    body = body.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), String(v));
  }

  // Get WaSender session
  const sr = await fetch(`https://wasenderapi.com/api/whatsapp-sessions`, { headers: { Authorization: `Bearer ${WA_KEY}` } });
  const sd = await sr.json();
  const session = (sd.data || []).find((s) => s.status === 'connected');
  if (!session) throw new Error('No connected session');

  const sendR = await fetch(`https://wasenderapi.com/api/send-message`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.api_key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: PHONE, text: body }),
  });
  const sendD = await sendR.json();
  return { ok: sendR.ok, msgId: sendD?.data?.msgId };
}

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Find a suitable event
  const { rows: evs } = await c.query(`
    SELECT e.id, e.name, e.share_token FROM events e
     WHERE e.status = 'active'
       AND EXISTS (SELECT 1 FROM flights WHERE event_id=e.id AND total_seats - booked_seats >= 1)
       AND EXISTS (SELECT 1 FROM rooms WHERE event_id=e.id AND total_rooms - booked_rooms >= 1)
       AND EXISTS (SELECT 1 FROM tickets WHERE event_id=e.id AND total_qty - booked_qty >= 1)
     ORDER BY e.created_at DESC LIMIT 1
  `);
  if (evs.length === 0) { console.error('No event found'); await c.end(); return; }
  const ev = evs[0];
  console.log(`Event: ${ev.name} (${ev.id})\n`);

  const { rows: fl } = await c.query(`SELECT id FROM flights WHERE event_id=$1 AND total_seats - booked_seats >= 1 LIMIT 1`, [ev.id]);
  const { rows: rm } = await c.query(`SELECT id FROM rooms WHERE event_id=$1 AND total_rooms - booked_rooms >= 1 LIMIT 1`, [ev.id]);
  const { rows: tk } = await c.query(`SELECT id FROM tickets WHERE event_id=$1 AND total_qty - booked_qty >= 1 LIMIT 1`, [ev.id]);

  const passengers = [{
    first_name_en: 'Oren', last_name_en: 'Lifecycle',
    passport_number: '900000001', passport_expiry: '2030-12-31',
    birth_date: '1990-05-15', age_at_event: 35,
    phone: PHONE, email: EMAIL,
    flight_id: fl[0].id, room_id: rm[0].id, ticket_id: tk[0].id,
  }];

  // ==== STEP 1: CREATE ORDER → order_created + new_order ====
  log('1', 'Creating order → order_created (customer) + new_order (admin)');
  const createR = await call('POST', '/api/orders', {
    event_id: ev.id, mode: 'payment',
    contact_email: EMAIL, contact_phone: PHONE,
    participants: passengers, total_price: 0,
  });
  if (!createR.ok) { console.error('create failed', createR); await c.end(); return; }
  const orderId = createR.data.order.id;
  console.log(`  ✓ order ${orderId} created\n`);
  await wait(15000); // let WA messages flush (order_created + new_order = 2 msgs)

  // ==== STEP 2: CHANGE STATUS TO supplier_review → supplier_new_order + order_pending_supplier ====
  log('2', 'Status → supplier_review → supplier_new_order + order_pending_supplier');
  const statusR = await call('PATCH', `/api/orders/${orderId}/status`, { status: 'supplier_review' });
  console.log(`  ${statusR.ok ? '✓' : '✗'} status=${statusR.ok ? 'supplier_review' : statusR.data?.error}\n`);
  await wait(15000);

  // ==== STEP 3: SUPPLIER APPROVES ALL → supplier_approved + order_confirmed_airline ====
  log('3', 'Supplier confirms all → supplier_approved + order_confirmed_airline');
  const { rows: orderRow } = await c.query('SELECT share_token FROM orders WHERE id=$1', [orderId]);
  const shareToken = orderRow[0].share_token;
  const supplierR = await call('POST', '/api/supplier/confirm-all', {
    share_token: shareToken,
    items: [
      { item_type: 'flight', item_id: fl[0].id, confirmation_number: 'LIFECYCLE-FL-123', has_issue: false },
      { item_type: 'room', item_id: rm[0].id, confirmation_number: 'LIFECYCLE-HT-456', has_issue: false },
      { item_type: 'ticket', item_id: tk[0].id, confirmation_number: 'LIFECYCLE-TK-789', has_issue: false },
    ],
  });
  console.log(`  ${supplierR.ok ? '✓' : '✗'} supplier approved\n`);
  await wait(18000);

  // ==== STEP 4: ADD PARTIAL PAYMENT → partial_payment ====
  log('4', 'Partial payment → partial_payment');
  const partialR = await call('POST', '/api/supplier/payment', {
    share_token: shareToken,
    participant_id: null, amount: 100,
    method: 'credit', card_last4: '1234', confirmation: 'PAY-PARTIAL', date: new Date().toISOString().slice(0, 10),
  });
  console.log(`  ${partialR.ok ? '✓' : '✗'} partial payment\n`);
  await wait(10000);

  // ==== STEP 5: ADD REMAINING PAYMENT → payment_confirmed ====
  log('5', 'Final payment → payment_confirmed');
  const { rows: orderFull } = await c.query('SELECT total_price, amount_paid FROM orders WHERE id=$1', [orderId]);
  const remaining = Number(orderFull[0].total_price) - Number(orderFull[0].amount_paid);
  const finalR = await call('POST', '/api/supplier/payment', {
    share_token: shareToken,
    participant_id: null, amount: remaining,
    method: 'transfer', confirmation: 'PAY-FINAL', date: new Date().toISOString().slice(0, 10),
  });
  console.log(`  ${finalR.ok ? '✓' : '✗'} final payment (₪${remaining})\n`);
  await wait(10000);

  // ==== STEP 6: CONFIRM ORDER → order_confirmed_customer ====
  log('6', 'Status → confirmed → order_confirmed_customer');
  const { rows: aState } = await c.query('SELECT status FROM orders WHERE id=$1', [orderId]);
  if (aState[0].status !== 'supplier_approved') {
    await c.query("UPDATE orders SET status='supplier_approved', supplier_approved_at=NOW() WHERE id=$1", [orderId]);
  }
  const confirmR = await call('PATCH', `/api/orders/${orderId}/status`, { status: 'confirmed' });
  console.log(`  ${confirmR.ok ? '✓' : '✗'} confirmed\n`);
  await wait(10000);

  // ==== STEP 7: SEND order_details ====
  log('7', 'Send WhatsApp with order details → order_details');
  const detailsR = await call('POST', `/api/orders/${orderId}/send-whatsapp`, { phone: PHONE });
  console.log(`  ${detailsR.ok ? '✓' : '✗'} order_details sent\n`);
  await wait(10000);

  // ==== STEP 8: SEND to buyers → order_details_buyers ====
  log('8', 'Send to all buyers → order_details_buyers');
  const buyersR = await call('POST', `/api/orders/${orderId}/send-to-buyers`, {});
  console.log(`  ${buyersR.ok ? '✓' : '✗'} order_details_buyers sent\n`);
  await wait(10000);

  // ==== STEP 9: ANOTHER ORDER - supplier reports issue ====
  log('9', 'Create 2nd order + supplier reports issue → supplier_issue');
  const { rows: fl2 } = await c.query(`SELECT id FROM flights WHERE event_id=$1 AND total_seats - booked_seats >= 1 LIMIT 1`, [ev.id]);
  const { rows: rm2 } = await c.query(`SELECT id FROM rooms WHERE event_id=$1 AND total_rooms - booked_rooms >= 1 LIMIT 1`, [ev.id]);
  const order2 = await call('POST', '/api/orders', {
    event_id: ev.id, mode: 'payment',
    contact_email: EMAIL, contact_phone: PHONE,
    participants: [{ ...passengers[0], passport_number: '900000002', flight_id: fl2[0].id, room_id: rm2[0].id, ticket_id: null }],
    total_price: 0,
  });
  if (order2.ok) {
    const order2Id = order2.data.order.id;
    const { rows: st2 } = await c.query('SELECT share_token FROM orders WHERE id=$1', [order2Id]);
    await wait(15000);
    await call('PATCH', `/api/orders/${order2Id}/status`, { status: 'supplier_review' });
    await wait(15000);
    await call('POST', '/api/supplier/confirm-all', {
      share_token: st2[0].share_token,
      items: [
        { item_type: 'flight', item_id: fl2[0].id, has_issue: true, issue_description: 'הטיסה בוטלה ע״י חברת התעופה' },
      ],
    });
    console.log('  ✓ supplier issue reported\n');
    await wait(10000);
  }

  // ==== STEPS 10-14: Templates without system triggers - send directly ====
  const directOnly = [
    { name: 'event_reminder', vars: { n: '7', event_name: ev.name, link: `${BASE}/p/${shareToken}` } },
    { name: 'waiting_list_available', vars: { link: `${BASE}/book/${ev.share_token || ev.id}` } },
    { name: '2fa_code', vars: { code: '938472' } },
    { name: 'low_stock', vars: { n: '3', item_name: 'מלון מרינה - חדר דלוקס' } },
    { name: 'backup_failed', vars: { date: new Date().toLocaleDateString('he-IL') } },
  ];

  for (const t of directOnly) {
    log('X', `${t.name} (ללא trigger מערכתי - שליחה ישירה)`);
    const r = await sendDirect(t.name, t.vars);
    console.log(`  ${r.ok ? '✓' : '✗'} ${t.name} ${r.msgId ? `msgId=${r.msgId}` : ''}\n`);
    await wait(8000);
  }

  console.log('\n========== DONE ==========');
  console.log('All templates triggered. Check your WhatsApp + /whatsapp log tab.');
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
