const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const { Client } = require('pg');

const PHONE = '0524802830';
const EMAIL = 'oren@bin.co.il';
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://eng-tours.vercel.app';

async function createOrder(eventId, passengers, label) {
  console.log(`\n=== Creating order: ${label} ===`);
  const res = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: eventId,
      mode: 'payment',
      contact_email: EMAIL,
      contact_phone: '+972' + PHONE.slice(1),
      participants: passengers,
      total_price: 0, // server computes
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.log('❌ Failed:', data);
    return null;
  }
  const orderId = data?.order?.id || data?.id;
  console.log('✓ Order created:', orderId);
  console.log('  WhatsApp should have been sent to:', PHONE);
  return orderId;
}

(async () => {
  const c = new Client({
    host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // Find an event with flights + rooms + tickets available
  const { rows: evs } = await c.query(`
    SELECT e.id, e.name
      FROM events e
     WHERE e.status = 'active'
       AND EXISTS (SELECT 1 FROM flights WHERE event_id=e.id AND total_seats - booked_seats >= 2)
       AND EXISTS (SELECT 1 FROM rooms WHERE event_id=e.id AND total_rooms - booked_rooms >= 1)
       AND EXISTS (SELECT 1 FROM tickets WHERE event_id=e.id AND total_qty - booked_qty >= 2)
     ORDER BY e.created_at DESC
     LIMIT 2
  `);
  console.log('Events found:', evs.map((e) => `${e.id} (${e.name})`));

  if (evs.length === 0) {
    console.log('No suitable event found');
    await c.end();
    return;
  }

  const ev1 = evs[0];

  // Get service IDs for ev1
  const { rows: f1 } = await c.query(`SELECT id FROM flights WHERE event_id=$1 AND total_seats - booked_seats >= 2 LIMIT 2`, [ev1.id]);
  const { rows: r1 } = await c.query(`SELECT id FROM rooms WHERE event_id=$1 AND total_rooms - booked_rooms >= 1 LIMIT 1`, [ev1.id]);
  const { rows: t1 } = await c.query(`SELECT id FROM tickets WHERE event_id=$1 AND total_qty - booked_qty >= 2 LIMIT 1`, [ev1.id]);

  // Order 1: solo traveler with my phone (main contact only)
  await createOrder(ev1.id, [
    {
      first_name_en: 'Oren', last_name_en: 'Test1',
      passport_number: '111111111', passport_expiry: '2030-12-31',
      birth_date: '1990-05-15', age_at_event: 35,
      phone: '+972' + PHONE.slice(1), email: EMAIL,
      flight_id: f1[0]?.id || null,
      room_id: r1[0]?.id || null,
      ticket_id: t1[0]?.id || null,
    },
  ], `Solo order on ${ev1.name}`);

  await new Promise((r) => setTimeout(r, 10000)); // avoid WA rate limit

  // Order 2: couple - second passenger uses main contact for fallback
  const ev2 = evs[1] || ev1;
  const { rows: f2 } = await c.query(`SELECT id FROM flights WHERE event_id=$1 AND total_seats - booked_seats >= 2 LIMIT 2`, [ev2.id]);
  const { rows: r2 } = await c.query(`SELECT id FROM rooms WHERE event_id=$1 AND total_rooms - booked_rooms >= 1 LIMIT 1`, [ev2.id]);
  const { rows: t2 } = await c.query(`SELECT id FROM tickets WHERE event_id=$1 AND total_qty - booked_qty >= 2 LIMIT 1`, [ev2.id]);

  await createOrder(ev2.id, [
    {
      first_name_en: 'Oren', last_name_en: 'Test2',
      passport_number: '222222222', passport_expiry: '2030-12-31',
      birth_date: '1990-05-15', age_at_event: 35,
      phone: '+972' + PHONE.slice(1), email: EMAIL,
      flight_id: f2[0]?.id || null,
      room_id: r2[0]?.id || null,
      ticket_id: t2[0]?.id || null,
    },
    {
      first_name_en: 'Partner', last_name_en: 'Test2',
      passport_number: '333333333', passport_expiry: '2030-12-31',
      birth_date: '1992-08-20', age_at_event: 33,
      phone: '+972' + PHONE.slice(1), email: EMAIL, // same contact
      flight_id: f2[0]?.id || null,
      room_id: r2[0]?.id || null,
      ticket_id: t2[0]?.id || null,
    },
  ], `Couple order on ${ev2.name}`);

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
