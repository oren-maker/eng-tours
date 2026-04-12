const { Client } = require('pg');

const client = new Client({
  host: 'db.ijeauuonjtskughxtmic.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: 'ADujZgABkbYW2G7a', ssl: { rejectUnauthorized: false }
});

const FIRST = ['Avi', 'David', 'Sarah', 'Rachel', 'Yossi', 'Dana', 'Tal', 'Noa', 'Ron', 'Liat'];
const LAST = ['Cohen', 'Levi', 'Mizrahi', 'Friedman', 'Peretz', 'Biton', 'Katz'];

function rand(n) { return Math.floor(Math.random() * n); }
function pick(a) { return a[rand(a.length)]; }
function phone() { return '05' + (2 + rand(8)).toString() + (1000000 + rand(9000000)).toString(); }

async function run() {
  await client.connect();

  // FIX 1: Any confirmed/completed order without supplier confirmations → set back to supplier_review
  const fixRes = await client.query(`
    UPDATE orders SET status = 'supplier_review'
    WHERE status IN ('confirmed', 'completed')
      AND id NOT IN (SELECT DISTINCT order_id FROM supplier_confirmations WHERE order_id IS NOT NULL)
    RETURNING id
  `);
  console.log(`Fixed ${fixRes.rows.length} orders - moved from confirmed→supplier_review (missing supplier approval)`);

  // FIX 2: Make sure every order has participants
  const ordersWithoutParticipants = await client.query(`
    SELECT o.id, o.event_id, o.total_price FROM orders o
    WHERE NOT EXISTS (SELECT 1 FROM participants p WHERE p.order_id = o.id)
  `);
  console.log(`Found ${ordersWithoutParticipants.rows.length} orders without participants`);

  for (const o of ordersWithoutParticipants.rows) {
    const groupSize = 1 + rand(3);
    for (let i = 0; i < groupSize; i++) {
      const first = pick(FIRST);
      const last = pick(LAST);
      await client.query(
        `INSERT INTO participants (order_id, first_name_en, last_name_en, passport_number, birth_date, phone, email)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [o.id, first, last, `${100000000 + rand(900000000)}`,
         `${1970 + rand(35)}-0${1 + rand(9)}-1${rand(9)}`,
         phone(), `${first.toLowerCase()}.${last.toLowerCase()}@example.com`]
      );
    }
  }
  console.log(`Added participants to orphan orders`);

  // FIX 3: Add 10 pending_payment orders (awaiting admin approval)
  const events = (await client.query('SELECT id, mode FROM events WHERE status = $1 LIMIT 10', ['active'])).rows;
  for (const ev of events) {
    const flights = (await client.query('SELECT id, price_customer FROM flights WHERE event_id = $1 LIMIT 2', [ev.id])).rows;
    const rooms = (await client.query('SELECT id, price_customer FROM rooms WHERE event_id = $1 LIMIT 1', [ev.id])).rows;
    const tickets = (await client.query('SELECT id, price_customer FROM tickets WHERE event_id = $1 LIMIT 1', [ev.id])).rows;

    const groupSize = 1 + rand(4);
    const flightPrice = (flights[0]?.price_customer || 0) * groupSize;
    const roomPrice = (rooms[0]?.price_customer || 0) * groupSize;
    const ticketPrice = (tickets[0]?.price_customer || 0) * groupSize;
    const total = flightPrice + roomPrice + ticketPrice;

    const orderRes = await client.query(
      `INSERT INTO orders (event_id, status, mode, total_price, amount_paid)
       VALUES ($1,'pending_payment',$2,$3,0) RETURNING id`,
      [ev.id, ev.mode, total]
    );
    const oid = orderRes.rows[0].id;

    for (let i = 0; i < groupSize; i++) {
      const first = pick(FIRST);
      const last = pick(LAST);
      await client.query(
        `INSERT INTO participants (order_id, first_name_en, last_name_en, passport_number, birth_date, phone, email, flight_id, room_id, ticket_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [oid, first, last, `${100000000 + rand(900000000)}`,
         `${1970 + rand(35)}-0${1 + rand(9)}-1${rand(9)}`,
         phone(), `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
         flights[0]?.id, rooms[0]?.id, tickets[0]?.id]
      );
    }

    await client.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, after_data)
       VALUES ('create', 'order', $1, $2)`,
      [oid, JSON.stringify({ status: 'pending_payment', total_price: total })]
    );
  }
  console.log(`Added 10 new pending_payment orders`);

  // Summary
  const stats = await client.query(`
    SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY count DESC
  `);
  console.log('\n=== Order statuses ===');
  stats.rows.forEach((r) => console.log(`  ${r.status}: ${r.count}`));

  const total = await client.query('SELECT COUNT(*) FROM orders');
  const parts = await client.query('SELECT COUNT(*) FROM participants');
  console.log(`\nTotal orders: ${total.rows[0].count}`);
  console.log(`Total participants: ${parts.rows[0].count}`);

  await client.end();
}
run().catch((e) => { console.error(e.message); client.end(); process.exit(1); });
