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

  // Odd rows: fully paid, even rows: partial (50%)
  const r = await c.query(`
    WITH ranked AS (
      SELECT id, total_price, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
        FROM orders
       WHERE status NOT IN ('cancelled', 'draft')
         AND total_price IS NOT NULL AND total_price > 0
    )
    UPDATE orders o
       SET amount_paid = CASE WHEN r.rn % 2 = 1 THEN r.total_price ELSE ROUND(r.total_price * 0.5, 2) END,
           status = CASE WHEN r.rn % 2 = 1 THEN 'completed' ELSE 'partial' END
      FROM ranked r
     WHERE o.id = r.id
     RETURNING o.id, o.status, o.amount_paid, o.total_price;
  `);
  console.log('orders updated:', r.rowCount);

  const summary = await c.query(`
    SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY status;
  `);
  console.log('order status counts:');
  for (const row of summary.rows) console.log(' ', row.status, row.count);

  const pay = await c.query(`
    SELECT COUNT(*) FILTER (WHERE payment_amount IS NOT NULL) AS with_payment,
           COUNT(*) AS total
      FROM supplier_confirmations;
  `);
  console.log('supplier_confirmations payment:', pay.rows[0]);

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
