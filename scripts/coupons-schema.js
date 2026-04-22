const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '').trim(); }
(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='coupons' AND table_schema='public' ORDER BY ordinal_position`);
  console.log('coupons:', r.rows.map(x => x.column_name).join(', '));
  await c.end();
})();
