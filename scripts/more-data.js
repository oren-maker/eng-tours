const { Client } = require('pg');
const client = new Client({
  host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres',
  password: 'ADujZgABkbYW2G7a', ssl: { rejectUnauthorized: false }
});

const FIRST = ['Avi', 'David', 'Sarah', 'Rachel', 'Yossi', 'Dana', 'Tal', 'Noa', 'Ron', 'Liat'];
const LAST = ['Cohen', 'Levi', 'Mizrahi', 'Friedman', 'Peretz', 'Biton', 'Katz'];
function rand(n) { return Math.floor(Math.random() * n); }
function pick(a) { return a[rand(a.length)]; }
function phone() { return '05' + (2 + rand(8)) + (1000000 + rand(9000000)); }

async function run() {
  await client.connect();

  // 1. Create 2 archived events (end_date in past)
  console.log('Creating 2 archived events...');
  const pastEvents = [
    { id: 'RL' + (10000 + rand(90000)), name: 'טיול פריז 2025', country: 'צרפת', type: 'RL' },
    { id: 'FI' + (10000 + rand(90000)), name: 'אילת חורף 2025', country: 'ישראל', type: 'FI' },
  ];

  for (const ev of pastEvents) {
    const startDate = '2025-11-01';
    const endDate = '2025-11-10';
    await client.query(
      `INSERT INTO events (id, name, description, type_code, services, start_date, end_date, mode, status, destination_country)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'payment','archived',$8)`,
      [ev.id, ev.name, 'אירוע שהסתיים - ' + ev.country, ev.type,
       ev.type === 'RL' ? ['flight_international','hotel_international'] : ['flight_domestic','hotel_domestic'],
       startDate, endDate, ev.country]
    );

    // Add a few flights, rooms, tickets for archive
    const airlines = (await client.query('SELECT id, name, iata_code FROM airlines LIMIT 2')).rows;
    const hotels = (await client.query('SELECT id FROM hotels LIMIT 2')).rows;

    for (const a of airlines) {
      await client.query(
        `INSERT INTO flights (airline_id, airline_name, event_id, flight_code, departure_time, arrival_time, origin_city, origin_iata, dest_city, dest_iata, total_seats, booked_seats, price_company, price_customer, currency)
         VALUES ($1,$2,$3,$4,$5,$6,'Tel Aviv','TLV','Paris','CDG',100,85,800,1200,'ILS')`,
        [a.id, a.name, ev.id, a.iata_code + (100 + rand(899)), startDate + 'T08:00', endDate + 'T20:00']
      );
    }

    for (const h of hotels) {
      await client.query(
        `INSERT INTO rooms (hotel_id, event_id, check_in, check_out, room_type, price_company, price_customer, currency, capacity, total_rooms, booked_rooms)
         VALUES ($1,$2,$3,$4,'double',300,500,'ILS',2,20,16)`,
        [h.id, ev.id, startDate, endDate]
      );
    }

    await client.query(
      `INSERT INTO tickets (event_id, name, price_customer, price_company, payment_type, total_qty, booked_qty, currency)
       VALUES ($1,'רגיל',150,90,'credit',200,180,'ILS')`,
      [ev.id]
    );

    console.log(`  ✓ Archived event: ${ev.name}`);
  }

  // 2. Add 2 pending orders for every active event
  console.log('\nAdding pending orders to every event...');
  const events = (await client.query("SELECT id, mode FROM events WHERE status = 'active'")).rows;

  for (const ev of events) {
    const existingPending = (await client.query(
      "SELECT COUNT(*) FROM orders WHERE event_id = $1 AND status = 'pending_payment'",
      [ev.id]
    )).rows[0].count;

    // Ensure at least 2 pending_payment orders per event
    const needed = Math.max(0, 2 - parseInt(existingPending));
    if (needed === 0) continue;

    const flights = (await client.query('SELECT id, price_customer FROM flights WHERE event_id = $1 LIMIT 2', [ev.id])).rows;
    const rooms = (await client.query('SELECT id, price_customer FROM rooms WHERE event_id = $1 LIMIT 1', [ev.id])).rows;

    for (let i = 0; i < needed; i++) {
      const groupSize = 1 + rand(3);
      const total = ((flights[0]?.price_customer || 500) + (rooms[0]?.price_customer || 400)) * groupSize;
      const orderRes = await client.query(
        `INSERT INTO orders (event_id, status, mode, total_price, amount_paid)
         VALUES ($1, 'pending_payment', $2, $3, 0) RETURNING id`,
        [ev.id, ev.mode || 'payment', total]
      );
      const oid = orderRes.rows[0].id;

      for (let p = 0; p < groupSize; p++) {
        const first = pick(FIRST);
        const last = pick(LAST);
        await client.query(
          `INSERT INTO participants (order_id, first_name_en, last_name_en, passport_number, birth_date, phone, email, flight_id, room_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [oid, first, last, `${100000000 + rand(900000000)}`,
           `${1970 + rand(35)}-0${1 + rand(9)}-1${rand(9)}`,
           phone(), `${first.toLowerCase()}.${last.toLowerCase()}@test.com`,
           flights[0]?.id, rooms[0]?.id]
        );
      }
    }

    console.log(`  ✓ ${ev.id}: added ${needed} pending orders`);
  }

  const summary = await client.query('SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY 1');
  console.log('\n=== Status summary ===');
  summary.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

  await client.end();
}

run().catch(e => { console.error(e.message); client.end(); process.exit(1); });
