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

  const methods = ['credit', 'transfer', 'cash'];

  // For every (order, flight) combo in non-cancelled/non-draft orders:
  const flights = await c.query(`
    INSERT INTO supplier_confirmations (order_id, item_type, item_id, confirmation_number, has_issue, payment_amount, payment_currency, payment_method, payment_installments, payment_date)
    SELECT p.order_id, 'flight', p.flight_id,
           'FL-' || LPAD((ABS(HASHTEXT(p.flight_id::text || p.order_id::text)) % 900000 + 100000)::text, 6, '0'),
           false,
           f.price_company * COUNT(*),
           'ILS',
           (ARRAY['credit','transfer','cash'])[1 + (ABS(HASHTEXT(p.order_id::text)) % 3)],
           CASE WHEN (ABS(HASHTEXT(p.order_id::text)) % 3) = 0 THEN 3 ELSE 1 END,
           o.created_at::date + INTERVAL '1 day'
      FROM participants p
      JOIN orders o ON o.id = p.order_id
      JOIN flights f ON f.id = p.flight_id
     WHERE p.flight_id IS NOT NULL
       AND o.status NOT IN ('cancelled', 'draft')
       AND f.price_company IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM supplier_confirmations sc
          WHERE sc.order_id = p.order_id AND sc.item_type='flight' AND sc.item_id = p.flight_id
       )
     GROUP BY p.order_id, p.flight_id, f.price_company, o.created_at
     ON CONFLICT DO NOTHING;
  `);
  console.log('flight confirmations added:', flights.rowCount);

  const rooms = await c.query(`
    INSERT INTO supplier_confirmations (order_id, item_type, item_id, confirmation_number, has_issue, payment_amount, payment_currency, payment_method, payment_installments, payment_date)
    SELECT p.order_id, 'room', p.room_id,
           'HT-' || LPAD((ABS(HASHTEXT(p.room_id::text || p.order_id::text)) % 900000 + 100000)::text, 6, '0'),
           false,
           r.price_company * COUNT(*),
           'ILS',
           (ARRAY['credit','transfer','cash'])[1 + (ABS(HASHTEXT(p.order_id::text)) % 3)],
           CASE WHEN (ABS(HASHTEXT(p.order_id::text)) % 3) = 0 THEN 3 ELSE 1 END,
           o.created_at::date + INTERVAL '1 day'
      FROM participants p
      JOIN orders o ON o.id = p.order_id
      JOIN rooms r ON r.id = p.room_id
     WHERE p.room_id IS NOT NULL
       AND o.status NOT IN ('cancelled', 'draft')
       AND r.price_company IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM supplier_confirmations sc
          WHERE sc.order_id = p.order_id AND sc.item_type='room' AND sc.item_id = p.room_id
       )
     GROUP BY p.order_id, p.room_id, r.price_company, o.created_at;
  `);
  console.log('room confirmations added:', rooms.rowCount);

  const tickets = await c.query(`
    INSERT INTO supplier_confirmations (order_id, item_type, item_id, confirmation_number, has_issue, payment_amount, payment_currency, payment_method, payment_installments, payment_date)
    SELECT p.order_id, 'ticket', p.ticket_id,
           'TK-' || LPAD((ABS(HASHTEXT(p.ticket_id::text || p.order_id::text)) % 900000 + 100000)::text, 6, '0'),
           false,
           t.price_company * COUNT(*),
           'ILS',
           (ARRAY['credit','transfer','cash'])[1 + (ABS(HASHTEXT(p.order_id::text)) % 3)],
           CASE WHEN (ABS(HASHTEXT(p.order_id::text)) % 3) = 0 THEN 3 ELSE 1 END,
           o.created_at::date + INTERVAL '1 day'
      FROM participants p
      JOIN orders o ON o.id = p.order_id
      JOIN tickets t ON t.id = p.ticket_id
     WHERE p.ticket_id IS NOT NULL
       AND o.status NOT IN ('cancelled', 'draft')
       AND t.price_company IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM supplier_confirmations sc
          WHERE sc.order_id = p.order_id AND sc.item_type='ticket' AND sc.item_id = p.ticket_id
       )
     GROUP BY p.order_id, p.ticket_id, t.price_company, o.created_at;
  `);
  console.log('ticket confirmations added:', tickets.rowCount);

  const total = await c.query(`SELECT COUNT(*) FROM supplier_confirmations`);
  console.log('total confirmations now:', total.rows[0].count);

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
