const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

(async () => {
  const c = new Client({
    host: 'db.ijeauuonjtskughxtmic.supabase.co',
    port: 5432, database: 'postgres', user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // Backfill payment_amount where null, using price_company × participant count
  // Only for orders that are completed/confirmed/supplier_approved/partial

  const flights = await c.query(`
    UPDATE supplier_confirmations sc
       SET payment_amount = f.price_company * pc.cnt,
           payment_currency = COALESCE(payment_currency, 'ILS'),
           payment_installments = COALESCE(payment_installments, 1)
      FROM flights f,
           (SELECT order_id, flight_id, COUNT(*) AS cnt FROM participants WHERE flight_id IS NOT NULL GROUP BY order_id, flight_id) pc
     WHERE sc.item_type = 'flight'
       AND sc.payment_amount IS NULL
       AND f.id = sc.item_id
       AND pc.order_id = sc.order_id
       AND pc.flight_id = sc.item_id
       AND f.price_company IS NOT NULL
     RETURNING sc.id;
  `);
  console.log('flights updated:', flights.rowCount);

  const rooms = await c.query(`
    UPDATE supplier_confirmations sc
       SET payment_amount = r.price_company * pc.cnt,
           payment_currency = COALESCE(payment_currency, 'ILS'),
           payment_installments = COALESCE(payment_installments, 1)
      FROM rooms r,
           (SELECT order_id, room_id, COUNT(*) AS cnt FROM participants WHERE room_id IS NOT NULL GROUP BY order_id, room_id) pc
     WHERE sc.item_type = 'room'
       AND sc.payment_amount IS NULL
       AND r.id = sc.item_id
       AND pc.order_id = sc.order_id
       AND pc.room_id = sc.item_id
       AND r.price_company IS NOT NULL
     RETURNING sc.id;
  `);
  console.log('rooms updated:', rooms.rowCount);

  const tickets = await c.query(`
    UPDATE supplier_confirmations sc
       SET payment_amount = t.price_company * pc.cnt,
           payment_currency = COALESCE(payment_currency, 'ILS'),
           payment_installments = COALESCE(payment_installments, 1)
      FROM tickets t,
           (SELECT order_id, ticket_id, COUNT(*) AS cnt FROM participants WHERE ticket_id IS NOT NULL GROUP BY order_id, ticket_id) pc
     WHERE sc.item_type = 'ticket'
       AND sc.payment_amount IS NULL
       AND t.id = sc.item_id
       AND pc.order_id = sc.order_id
       AND pc.ticket_id = sc.item_id
       AND t.price_company IS NOT NULL
     RETURNING sc.id;
  `);
  console.log('tickets updated:', tickets.rowCount);

  const r = await c.query(`SELECT COUNT(*) FILTER (WHERE payment_amount IS NOT NULL) as with_payment, COUNT(*) as total FROM supplier_confirmations`);
  console.log('final:', r.rows);

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
