const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    SELECT sc.order_id, sc.item_type, sc.confirmation_number, sc.payment_amount, sc.payment_currency, sc.payment_method, sc.payment_installments
      FROM supplier_confirmations sc
     LIMIT 5;
  `);
  console.log(r.rows);
  await c.end();
})();
