const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
(async () => {
  const c = new Client({ host:'db.ijeauuonjtskughxtmic.supabase.co', port:5432, database:'postgres', user:'postgres', password:process.env.SUPABASE_DB_PASSWORD, ssl:{rejectUnauthorized:false} });
  await c.connect();
  // For cancelled orders without fee set, assign a random percent (10-50% in steps of 5)
  const r = await c.query(`
    UPDATE orders
       SET cancellation_fee_percent = pct,
           cancellation_fee_amount = ROUND(total_price * pct / 100, 2)
      FROM (
        SELECT id, 10 + 5 * (ABS(HASHTEXT(id::text)) % 9) AS pct
          FROM orders
         WHERE status = 'cancelled'
           AND total_price > 0
           AND (cancellation_fee_amount IS NULL OR cancellation_fee_amount = 0)
      ) f
     WHERE orders.id = f.id
     RETURNING orders.id;
  `);
  console.log('cancellation fees backfilled:', r.rowCount);
  const s = await c.query(`SELECT COUNT(*) FILTER (WHERE cancellation_fee_amount > 0) AS with_fee, SUM(cancellation_fee_amount) AS total FROM orders WHERE status='cancelled'`);
  console.log(s.rows);
  await c.end();
})();
