const { Client } = require('pg');

const client = new Client({
  host: 'db.ijeauuonjtskughxtmic.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: 'ADujZgABkbYW2G7a', ssl: { rejectUnauthorized: false }
});

const CONTACT_EMAIL = 'oren@bin.co.il';
const CONTACT_PHONE = '0524802830';

// 10 event templates
const eventTemplates = [
  { name: 'הוגל קפריסין', country: 'קפריסין', type: 'RL', services: ['flight_international', 'hotel_international'], origin: 'TLV', originCity: 'תל אביב', dest: 'LCA', destCity: 'לרנקה' },
  { name: 'פסטיבל יוון', country: 'יוון', type: 'RL', services: ['flight_international', 'hotel_international'], origin: 'TLV', originCity: 'תל אביב', dest: 'ATH', destCity: 'אתונה' },
  { name: 'חופשת רומא', country: 'איטליה', type: 'RL', services: ['flight_international', 'hotel_international'], origin: 'TLV', originCity: 'תל אביב', dest: 'FCO', destCity: 'רומא' },
  { name: 'סופ״ש בפריז', country: 'צרפת', type: 'RL', services: ['flight_international', 'hotel_international'], origin: 'TLV', originCity: 'תל אביב', dest: 'CDG', destCity: 'פריז' },
  { name: 'קונצרט ברצלונה', country: 'ספרד', type: 'RL', services: ['flight_international', 'hotel_international'], origin: 'TLV', originCity: 'תל אביב', dest: 'BCN', destCity: 'ברצלונה' },
  { name: 'לונדון קלאסי', country: 'בריטניה', type: 'RL', services: ['flight_international', 'hotel_international'], origin: 'TLV', originCity: 'תל אביב', dest: 'LHR', destCity: 'לונדון' },
  { name: 'אמסטרדם אקשן', country: 'הולנד', type: 'RL', services: ['flight_international', 'hotel_international'], origin: 'TLV', originCity: 'תל אביב', dest: 'AMS', destCity: 'אמסטרדם' },
  { name: 'פסטיבל ברלין', country: 'גרמניה', type: 'RL', services: ['flight_international', 'hotel_international'], origin: 'TLV', originCity: 'תל אביב', dest: 'BER', destCity: 'ברלין' },
  { name: 'ליל אילת', country: 'ישראל', type: 'FI', services: ['flight_domestic', 'hotel_domestic'], origin: 'TLV', originCity: 'תל אביב', dest: 'ETM', destCity: 'אילת' },
  { name: 'פסטיבל איי יוון', country: 'יוון', type: 'RL', services: ['flight_international', 'hotel_international'], origin: 'TLV', originCity: 'תל אביב', dest: 'HER', destCity: 'כרתים' },
];

const airlines = [
  { name: 'אל על', country: 'ישראל', iata: 'LY' },
  { name: 'ישראייר', country: 'ישראל', iata: 'IZ' },
  { name: 'ארקיע', country: 'ישראל', iata: 'IZ' },
];

const hotels = [
  { name: 'מלון פלאזה', stars: 5, rating: 5 },
  { name: 'מלון גרנד', stars: 4, rating: 4 },
  { name: 'מלון מרינה', stars: 3, rating: 4 },
];

const roomTypes = [
  { type: 'single', cap: 1 },
  { type: 'double', cap: 2 },
  { type: 'triple', cap: 3 },
  { type: 'family', cap: 4 },
  { type: 'suite', cap: 2 },
  { type: 'deluxe', cap: 2 },
  { type: 'executive', cap: 2 },
  { type: 'penthouse', cap: 4 },
  { type: 'standard', cap: 2 },
  { type: 'superior', cap: 2 },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function formatDateTime(d) {
  return d.toISOString();
}

async function seed() {
  await client.connect();
  console.log('Connected to DB');

  // 1. Create airlines
  console.log('\n=== Creating airlines ===');
  const airlineIds = {};
  for (const a of airlines) {
    const existing = await client.query('SELECT id FROM airlines WHERE name = $1', [a.name]);
    let id;
    if (existing.rows.length > 0) {
      id = existing.rows[0].id;
      console.log(`  ${a.name} already exists`);
    } else {
      const res = await client.query(
        `INSERT INTO airlines (name, country, iata_code, contact_name, contact_phone, contact_email, website)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [a.name, a.country, a.iata, 'אורן', CONTACT_PHONE, CONTACT_EMAIL, 'https://example.com']
      );
      id = res.rows[0].id;
      console.log(`  Created: ${a.name}`);
    }
    airlineIds[a.name] = id;
  }

  // 2. Create hotels
  console.log('\n=== Creating hotels ===');
  const hotelIds = {};
  for (const h of hotels) {
    const existing = await client.query('SELECT id FROM hotels WHERE name = $1', [h.name]);
    let id;
    if (existing.rows.length > 0) {
      id = existing.rows[0].id;
      console.log(`  ${h.name} already exists`);
    } else {
      const res = await client.query(
        `INSERT INTO hotels (name, stars, rating, contact_name, contact_phone, contact_email, website)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [h.name, h.stars, h.rating, 'אורן', CONTACT_PHONE, CONTACT_EMAIL, 'https://example.com']
      );
      id = res.rows[0].id;
      console.log(`  Created: ${h.name}`);
    }
    hotelIds[h.name] = id;
  }

  // 3. Create events, flights, rooms, tickets
  console.log('\n=== Creating events with resources ===');
  const now = new Date();

  for (let i = 0; i < eventTemplates.length; i++) {
    const tpl = eventTemplates[i];
    // Spread events over 6 months
    const startOffset = randomInt(14, 180);
    const duration = randomInt(3, 7);
    const startDate = addDays(now, startOffset);
    const endDate = addDays(startDate, duration);

    const eventId = `${tpl.type}${randomInt(10000, 99999)}`;

    // Create event
    await client.query(
      `INSERT INTO events (id, name, description, type_code, services, start_date, end_date, mode, status, waiting_list_enabled, destination_country)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [eventId, tpl.name, `חבילת נופש מיוחדת - ${tpl.country}`, tpl.type, tpl.services, formatDate(startDate), formatDate(endDate), 'payment', 'active', true, tpl.country]
    );
    console.log(`\n✓ Event: ${tpl.name} (${eventId}) - ${formatDate(startDate)} to ${formatDate(endDate)}`);

    // 20 flights per event - distribute across airlines
    const airlineNames = Object.keys(airlineIds);
    for (let f = 0; f < 20; f++) {
      const airlineName = airlineNames[f % airlineNames.length];
      const airlineId = airlineIds[airlineName];
      const isOutbound = f % 2 === 0;

      const flightDate = isOutbound ? startDate : endDate;
      const departTime = new Date(flightDate);
      departTime.setHours(8 + randomInt(0, 12), randomInt(0, 59), 0);
      const arriveTime = new Date(departTime);
      arriveTime.setHours(arriveTime.getHours() + randomInt(3, 8));

      const priceCost = randomInt(500, 2000);
      const priceCustomer = priceCost + randomInt(200, 500);

      await client.query(
        `INSERT INTO flights (airline_id, airline_name, event_id, flight_code, departure_time, arrival_time,
          origin_city, origin_iata, dest_city, dest_iata, total_seats, booked_seats, price_company, price_customer, currency, contact_name, contact_phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          airlineId, airlineName, eventId,
          `${airlines.find(a => a.name === airlineName).iata}${randomInt(100, 999)}`,
          formatDateTime(departTime), formatDateTime(arriveTime),
          isOutbound ? tpl.originCity : tpl.destCity,
          isOutbound ? tpl.origin : tpl.dest,
          isOutbound ? tpl.destCity : tpl.originCity,
          isOutbound ? tpl.dest : tpl.origin,
          randomInt(50, 200), 0, priceCost, priceCustomer, 'ILS',
          'אורן', CONTACT_PHONE,
        ]
      );
    }
    console.log(`  + 20 flights`);

    // 10 room types per hotel per event
    for (const hotelName of Object.keys(hotelIds)) {
      const hotelId = hotelIds[hotelName];
      for (const rt of roomTypes) {
        const basePrice = { single: 200, double: 350, triple: 450, family: 600, suite: 800, deluxe: 700, executive: 900, penthouse: 1500, standard: 300, superior: 500 };
        const priceCost = basePrice[rt.type] || 400;
        const priceCustomer = Math.round(priceCost * 1.4);

        await client.query(
          `INSERT INTO rooms (hotel_id, event_id, check_in, check_out, room_type, price_company, price_customer, currency, capacity, total_rooms, booked_rooms)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [hotelId, eventId, formatDate(startDate), formatDate(endDate), rt.type, priceCost, priceCustomer, 'ILS', rt.cap, randomInt(5, 20), 0]
        );
      }
    }
    console.log(`  + 30 rooms (3 hotels × 10 types)`);

    // 3 ticket types per event: regular, VIP, backstage
    const ticketTypes = [
      { name: 'רגיל', price: 150, qty: 500 },
      { name: 'VIP', price: 450, qty: 100 },
      { name: 'בק סטייג׳', price: 900, qty: 30 },
    ];
    for (const tt of ticketTypes) {
      await client.query(
        `INSERT INTO tickets (event_id, name, price_customer, price_company, payment_type, total_qty, booked_qty, currency)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [eventId, tt.name, tt.price, Math.round(tt.price * 0.6), 'credit', tt.qty, 0, 'ILS']
      );
    }
    console.log(`  + 3 tickets`);
  }

  // Summary
  console.log('\n=== Summary ===');
  const s1 = await client.query('SELECT COUNT(*) FROM events');
  const s2 = await client.query('SELECT COUNT(*) FROM flights');
  const s3 = await client.query('SELECT COUNT(*) FROM rooms');
  const s4 = await client.query('SELECT COUNT(*) FROM tickets');
  const s5 = await client.query('SELECT COUNT(*) FROM airlines');
  const s6 = await client.query('SELECT COUNT(*) FROM hotels');
  console.log(`Total events: ${s1.rows[0].count}`);
  console.log(`Total flights: ${s2.rows[0].count}`);
  console.log(`Total rooms: ${s3.rows[0].count}`);
  console.log(`Total tickets: ${s4.rows[0].count}`);
  console.log(`Total airlines: ${s5.rows[0].count}`);
  console.log(`Total hotels: ${s6.rows[0].count}`);

  await client.end();
  console.log('\n✅ Seed complete!');
}

seed().catch((e) => {
  console.error('Error:', e.message);
  client.end();
  process.exit(1);
});
