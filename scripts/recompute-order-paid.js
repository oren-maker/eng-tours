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
  const r = await c.query(`
    UPDATE orders o
       SET amount_paid = COALESCE(sums.s, 0)
      FROM (SELECT order_id, SUM(amount) AS s FROM payments GROUP BY order_id) sums
     WHERE o.id = sums.order_id;
  `);
  console.log('orders recomputed:', r.rowCount);
  await c.end();
})();
