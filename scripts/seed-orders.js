const { Client } = require('pg');

const client = new Client({
  host: 'db.ijeauuonjtskughxtmic.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: 'ADujZgABkbYW2G7a', ssl: { rejectUnauthorized: false }
});

const FIRST_NAMES = ['Avi', 'David', 'Sarah', 'Rachel', 'Yossi', 'Dana', 'Tal', 'Noa', 'Ron', 'Liat', 'Gal', 'Shira', 'Nir', 'Maya', 'Eran', 'Michal', 'Oren', 'Yael', 'Omer', 'Shani'];
const LAST_NAMES = ['Cohen', 'Levi', 'Mizrahi', 'Friedman', 'Peretz', 'Biton', 'Avraham', 'Azoulay', 'Gabay', 'Hen', 'Katz', 'Shapira', 'Golan', 'Amir', 'Dahan'];
const STATUSES = ['draft', 'pending_payment', 'partial', 'completed', 'supplier_review', 'supplier_approved', 'confirmed'];

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomPhone() { return '05' + randomInt(2, 9).toString() + randomInt(1000000, 9999999).toString(); }
function randomEmail(first, last) { return `${first.toLowerCase()}.${last.toLowerCase()}${randomInt(1,99)}@example.com`; }

async function seed() {
  await client.connect();
  console.log('Connected');

  const events = (await client.query('SELECT id, name, mode FROM events WHERE status = $1', ['active'])).rows;
  console.log(`Found ${events.length} events\n`);

  let totalOrders = 0;
  let totalParticipants = 0;

  for (const ev of events) {
    const flights = (await client.query('SELECT id, total_seats, booked_seats, price_customer FROM flights WHERE event_id = $1', [ev.id])).rows;
    const rooms = (await client.query('SELECT id, total_rooms, booked_rooms, capacity, price_customer FROM rooms WHERE event_id = $1', [ev.id])).rows;
    const tickets = (await client.query('SELECT id, total_qty, booked_qty, price_customer FROM tickets WHERE event_id = $1', [ev.id])).rows;

    // Calculate target 80% occupancy per resource
    const outboundFlights = flights.filter((_, i) => i % 2 === 0);
    const returnFlights = flights.filter((_, i) => i % 2 === 1);

    // Target flight seats (80% of total)
    const totalFlightSeats = outboundFlights.reduce((s, f) => s + (f.total_seats || 0), 0);
    const targetFlightSeats = Math.floor(totalFlightSeats * 0.8);

    let totalCreatedForEvent = 0;
    let participantsForEvent = 0;

    // Distribute orders across flights
    for (let fi = 0; fi < outboundFlights.length && participantsForEvent < targetFlightSeats; fi++) {
      const outFlight = outboundFlights[fi];
      const retFlight = returnFlights[fi] || returnFlights[0];
      const flightCapacity = outFlight.total_seats || 0;
      const flightTarget = Math.floor(flightCapacity * 0.8);

      let bookedThisFlight = 0;

      // Pick a room with availability
      const availableRooms = rooms.filter((r) => (r.total_rooms - r.booked_rooms) > 0);
      const availableTickets = tickets.filter((t) => (t.total_qty - t.booked_qty) > 0);

      while (bookedThisFlight < flightTarget) {
        const groupSize = randomInt(1, 4);
        if (bookedThisFlight + groupSize > flightTarget) break;

        // Pick random room with capacity
        const room = randomPick(availableRooms);
        const ticket = randomPick(availableTickets);

        const totalPrice = (outFlight.price_customer || 0) * groupSize
          + (retFlight.price_customer || 0) * groupSize
          + (room?.price_customer || 0) * groupSize
          + (ticket?.price_customer || 0) * groupSize;

        // Create order
        const status = randomPick(STATUSES);
        const amountPaid = status === 'confirmed' || status === 'completed' ? totalPrice :
                          status === 'partial' ? Math.floor(totalPrice * 0.5) : 0;

        const orderRes = await client.query(
          `INSERT INTO orders (event_id, status, mode, total_price, amount_paid)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [ev.id, status, ev.mode, totalPrice, amountPaid]
        );
        const orderId = orderRes.rows[0].id;

        // Create participants
        for (let p = 0; p < groupSize; p++) {
          const first = randomPick(FIRST_NAMES);
          const last = randomPick(LAST_NAMES);
          await client.query(
            `INSERT INTO participants (order_id, first_name_en, last_name_en, passport_number, birth_date, phone, email, flight_id, room_id, ticket_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              orderId, first, last,
              `${randomInt(100000000, 999999999)}`,
              `${randomInt(1960, 2005)}-${String(randomInt(1,12)).padStart(2,'0')}-${String(randomInt(1,28)).padStart(2,'0')}`,
              randomPhone(),
              randomEmail(first, last),
              outFlight.id, room?.id, ticket?.id,
            ]
          );
        }

        // Update booked counts
        await client.query('UPDATE flights SET booked_seats = booked_seats + $1 WHERE id = $2', [groupSize, outFlight.id]);
        if (retFlight) await client.query('UPDATE flights SET booked_seats = booked_seats + $1 WHERE id = $2', [groupSize, retFlight.id]);
        if (room) await client.query('UPDATE rooms SET booked_rooms = booked_rooms + $1 WHERE id = $2', [Math.ceil(groupSize / (room.capacity || 2)), room.id]);
        if (ticket) await client.query('UPDATE tickets SET booked_qty = booked_qty + $1 WHERE id = $2', [groupSize, ticket.id]);

        // Audit log
        await client.query(
          `INSERT INTO audit_log (action, entity_type, entity_id, after_data, created_at)
           VALUES ($1,$2,$3,$4,$5)`,
          ['create', 'order', orderId, JSON.stringify({ status, total_price: totalPrice, participants: groupSize }), new Date().toISOString()]
        );

        bookedThisFlight += groupSize;
        participantsForEvent += groupSize;
        totalCreatedForEvent++;
      }
    }

    console.log(`✓ ${ev.name}: ${totalCreatedForEvent} orders, ${participantsForEvent} participants`);
    totalOrders += totalCreatedForEvent;
    totalParticipants += participantsForEvent;
  }

  console.log(`\n✅ Created ${totalOrders} orders with ${totalParticipants} participants total`);

  await client.end();
}

seed().catch((e) => {
  console.error('Error:', e.message);
  client.end();
  process.exit(1);
});
