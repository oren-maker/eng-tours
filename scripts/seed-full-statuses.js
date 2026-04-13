const { Client } = require('pg');

const client = new Client({
  host: 'db.ijeauuonjtskughxtmic.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: 'ADujZgABkbYW2G7a', ssl: { rejectUnauthorized: false }
});

const FIRST_EN = ['Avi', 'David', 'Sarah', 'Rachel', 'Yossi', 'Dana', 'Tal', 'Noa', 'Ron', 'Liat', 'Gal', 'Shira', 'Nir', 'Maya', 'Eran', 'Michal', 'Oren', 'Yael', 'Omer', 'Shani', 'Itai', 'Adi', 'Ido', 'Lior', 'Ayelet'];
const LAST_EN = ['Cohen', 'Levi', 'Mizrahi', 'Friedman', 'Peretz', 'Biton', 'Avraham', 'Azoulay', 'Gabay', 'Hen', 'Katz', 'Shapira', 'Golan', 'Amir', 'Dahan', 'Ben-David', 'Rozen', 'Malka'];

const STATUSES = ['draft', 'pending_payment', 'partial', 'supplier_review', 'supplier_approved', 'completed', 'cancelled'];

function rand(n) { return Math.floor(Math.random() * n); }
function pick(a) { return a[rand(a.length)]; }
function phone() { return '+972-5' + (2 + rand(8)) + '-' + (1000000 + rand(9000000)); }
function email(f, l) { return `${f.toLowerCase()}.${l.toLowerCase()}${rand(99)}@gmail.com`; }
function birthDate() {
  const yr = 1965 + rand(45);
  const mo = String(1 + rand(12)).padStart(2, '0');
  const dy = String(1 + rand(28)).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}
function passport() { return `${100000000 + rand(900000000)}`; }

const ORDERS_PER_STATUS = 5;

async function seedForEvent(eventId) {
  console.log(`\n━━ Event ${eventId} ━━`);

  // Get available inventory for this event
  let flights = (await client.query(
    'SELECT id, total_seats, booked_seats, price_customer, price_company, currency FROM flights WHERE event_id = $1',
    [eventId]
  )).rows;
  let rooms = (await client.query(
    'SELECT id, total_rooms, booked_rooms, capacity, price_customer, price_company, currency FROM rooms WHERE event_id = $1',
    [eventId]
  )).rows;
  let tickets = (await client.query(
    'SELECT id, total_qty, booked_qty, price_customer, price_company, currency FROM tickets WHERE event_id = $1',
    [eventId]
  )).rows;

  // Ensure enough inventory - we need ~35 orders × avg 2 people = 70 slots per resource
  const totalNeeded = ORDERS_PER_STATUS * STATUSES.length * 3; // avg people per order

  async function ensureFlightCapacity() {
    const totalSeats = flights.reduce((s, f) => s + f.total_seats, 0);
    const bookedSeats = flights.reduce((s, f) => s + f.booked_seats, 0);
    const available = totalSeats - bookedSeats;
    if (available < totalNeeded && flights.length > 0) {
      const need = totalNeeded - available;
      // Add seats to the first flight
      await client.query(
        'UPDATE flights SET total_seats = total_seats + $1 WHERE id = $2',
        [need + 50, flights[0].id]
      );
      flights[0].total_seats += need + 50;
      console.log(`  +${need + 50} seats added to flights`);
    }
  }

  async function ensureRoomCapacity() {
    const totalRoomCapacity = rooms.reduce((s, r) => s + r.total_rooms * (r.capacity || 2), 0);
    const bookedCapacity = rooms.reduce((s, r) => s + r.booked_rooms * (r.capacity || 2), 0);
    const available = totalRoomCapacity - bookedCapacity;
    if (available < totalNeeded && rooms.length > 0) {
      const need = Math.ceil((totalNeeded - available) / (rooms[0].capacity || 2));
      await client.query(
        'UPDATE rooms SET total_rooms = total_rooms + $1 WHERE id = $2',
        [need + 30, rooms[0].id]
      );
      rooms[0].total_rooms += need + 30;
      console.log(`  +${need + 30} rooms added`);
    }
  }

  async function ensureTicketCapacity() {
    const totalQty = tickets.reduce((s, t) => s + t.total_qty, 0);
    const bookedQty = tickets.reduce((s, t) => s + t.booked_qty, 0);
    const available = totalQty - bookedQty;
    if (available < totalNeeded && tickets.length > 0) {
      const need = totalNeeded - available;
      await client.query(
        'UPDATE tickets SET total_qty = total_qty + $1 WHERE id = $2',
        [need + 100, tickets[0].id]
      );
      tickets[0].total_qty += need + 100;
      console.log(`  +${need + 100} tickets added`);
    }
  }

  await ensureFlightCapacity();
  await ensureRoomCapacity();
  await ensureTicketCapacity();

  // Re-fetch after capacity additions
  flights = (await client.query(
    'SELECT id, total_seats, booked_seats, price_customer, price_company, currency FROM flights WHERE event_id = $1',
    [eventId]
  )).rows;
  rooms = (await client.query(
    'SELECT id, total_rooms, booked_rooms, capacity, price_customer, price_company, currency FROM rooms WHERE event_id = $1',
    [eventId]
  )).rows;
  tickets = (await client.query(
    'SELECT id, total_qty, booked_qty, price_customer, price_company, currency FROM tickets WHERE event_id = $1',
    [eventId]
  )).rows;

  if (flights.length === 0 || rooms.length === 0 || tickets.length === 0) {
    console.log(`  ⚠ Missing resources - skipping`);
    return 0;
  }

  let created = 0;
  let flightIdx = 0, roomIdx = 0, ticketIdx = 0;

  for (const status of STATUSES) {
    for (let i = 0; i < ORDERS_PER_STATUS; i++) {
      const groupSize = 1 + rand(3); // 1-4 people

      // Pick flights/rooms/tickets with available capacity
      let flight = flights.find((f, idx) => idx >= flightIdx && (f.total_seats - f.booked_seats) >= groupSize)
        || flights.find((f) => (f.total_seats - f.booked_seats) >= groupSize);
      const returnFlight = flights.find((f) => f.id !== flight?.id && (f.total_seats - f.booked_seats) >= groupSize);

      const room = rooms.find((r, idx) => idx >= roomIdx && (r.total_rooms - r.booked_rooms) * (r.capacity || 2) >= groupSize)
        || rooms.find((r) => (r.total_rooms - r.booked_rooms) * (r.capacity || 2) >= groupSize);

      const ticket = tickets.find((t, idx) => idx >= ticketIdx && (t.total_qty - t.booked_qty) >= groupSize)
        || tickets.find((t) => (t.total_qty - t.booked_qty) >= groupSize);

      if (!flight || !room || !ticket) {
        console.log(`  ⚠ ${status} #${i + 1}: insufficient inventory`);
        continue;
      }

      const total = (Number(flight.price_customer) + (returnFlight ? Number(returnFlight.price_customer) : 0)
        + Number(room.price_customer) + Number(ticket.price_customer)) * groupSize;

      const amountPaid = status === 'completed' || status === 'confirmed' ? total
        : status === 'partial' ? Math.round(total * 0.5)
        : status === 'supplier_approved' || status === 'supplier_review' ? total
        : 0;

      const paymentMethod = amountPaid > 0 ? pick(['אשראי', 'העברה בנקאית', 'מזומן']) : null;

      // Create order
      const orderRes = await client.query(
        `INSERT INTO orders (event_id, status, mode, total_price, amount_paid, payment_method, supplier_viewed_at, supplier_approved_at, confirmed_at)
         VALUES ($1, $2, 'payment', $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          eventId, status, total, amountPaid, paymentMethod,
          ['supplier_review', 'supplier_approved', 'completed'].includes(status) ? new Date().toISOString() : null,
          ['supplier_approved', 'completed'].includes(status) ? new Date().toISOString() : null,
          status === 'completed' ? new Date().toISOString() : null,
        ]
      );
      const orderId = orderRes.rows[0].id;

      // Create participants with full details
      for (let p = 0; p < groupSize; p++) {
        const first = pick(FIRST_EN);
        const last = pick(LAST_EN);
        await client.query(
          `INSERT INTO participants (order_id, first_name_en, last_name_en, passport_number, passport_expiry, birth_date, phone, email, flight_id, room_id, ticket_id, amount_paid)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            orderId, first, last, passport(), '2030-12-31', birthDate(),
            phone(), email(first, last),
            flight.id, room.id, ticket.id,
            amountPaid > 0 ? Math.round(amountPaid / groupSize) : 0,
          ]
        );
      }

      // Update booked counts (only for non-cancelled)
      if (status !== 'cancelled') {
        await client.query('UPDATE flights SET booked_seats = booked_seats + $1 WHERE id = $2', [groupSize, flight.id]);
        if (returnFlight) await client.query('UPDATE flights SET booked_seats = booked_seats + $1 WHERE id = $2', [groupSize, returnFlight.id]);
        flight.booked_seats += groupSize;
        if (returnFlight) returnFlight.booked_seats += groupSize;

        const roomsNeeded = Math.ceil(groupSize / (room.capacity || 2));
        await client.query('UPDATE rooms SET booked_rooms = booked_rooms + $1 WHERE id = $2', [roomsNeeded, room.id]);
        room.booked_rooms += roomsNeeded;

        await client.query('UPDATE tickets SET booked_qty = booked_qty + $1 WHERE id = $2', [groupSize, ticket.id]);
        ticket.booked_qty += groupSize;
      }

      // For completed orders - add supplier confirmations
      if (status === 'completed') {
        await client.query(
          `INSERT INTO supplier_confirmations (order_id, item_type, item_id, confirmation_number, notes, has_issue)
           VALUES ($1, 'flight', $2, $3, 'אישור טיסה', false)`,
          [orderId, flight.id, 'FL-' + (100000 + rand(900000))]
        );
        await client.query(
          `INSERT INTO supplier_confirmations (order_id, item_type, item_id, confirmation_number, notes, has_issue)
           VALUES ($1, 'room', $2, $3, 'אישור חדר', false)`,
          [orderId, room.id, 'HT-' + (100000 + rand(900000))]
        );
        await client.query(
          `INSERT INTO supplier_confirmations (order_id, item_type, item_id, confirmation_number, notes, has_issue)
           VALUES ($1, 'ticket', $2, $3, 'אישור כרטיס', false)`,
          [orderId, ticket.id, 'TK-' + (100000 + rand(900000))]
        );
      } else if (status === 'supplier_approved') {
        // 2 out of 3 items confirmed
        await client.query(
          `INSERT INTO supplier_confirmations (order_id, item_type, item_id, confirmation_number, has_issue)
           VALUES ($1, 'flight', $2, $3, false)`,
          [orderId, flight.id, 'FL-' + (100000 + rand(900000))]
        );
        await client.query(
          `INSERT INTO supplier_confirmations (order_id, item_type, item_id, confirmation_number, has_issue)
           VALUES ($1, 'room', $2, $3, false)`,
          [orderId, room.id, 'HT-' + (100000 + rand(900000))]
        );
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_log (action, entity_type, entity_id, after_data)
         VALUES ('create', 'order', $1, $2)`,
        [orderId, JSON.stringify({ status, total_price: total, participants: groupSize })]
      );

      created++;
      flightIdx = (flightIdx + 1) % flights.length;
      roomIdx = (roomIdx + 1) % rooms.length;
      ticketIdx = (ticketIdx + 1) % tickets.length;
    }
    console.log(`  ✓ ${status}: ${ORDERS_PER_STATUS} orders`);
  }

  return created;
}

async function run() {
  await client.connect();

  const events = (await client.query(
    "SELECT id, name FROM events WHERE status = 'active'"
  )).rows;

  console.log(`Processing ${events.length} active events, ${ORDERS_PER_STATUS} orders per status...`);

  let totalCreated = 0;
  for (const ev of events) {
    const count = await seedForEvent(ev.id);
    totalCreated += count;
  }

  console.log(`\n✅ Created ${totalCreated} new orders`);

  const statusSummary = await client.query(
    'SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY 1'
  );
  console.log('\n=== Status summary ===');
  statusSummary.rows.forEach((r) => console.log(`  ${r.status}: ${r.count}`));

  const totalOrders = (await client.query('SELECT COUNT(*) FROM orders')).rows[0].count;
  const totalParts = (await client.query('SELECT COUNT(*) FROM participants')).rows[0].count;
  const totalConfs = (await client.query('SELECT COUNT(*) FROM supplier_confirmations')).rows[0].count;
  console.log(`\nTotal: ${totalOrders} orders, ${totalParts} participants, ${totalConfs} confirmations`);

  await client.end();
}

run().catch((e) => {
  console.error('Error:', e.message);
  client.end();
  process.exit(1);
});
