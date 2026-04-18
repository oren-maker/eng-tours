const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(fs.readFileSync('supabase/migrations/20260418_missing_indexes.sql', 'utf8'));
  const r = await c.query(`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('idx_users_phone','idx_whatsapp_log_order_created','idx_whatsapp_log_order')`);
  console.log('Indexes after migration:', r.rows.map(x => x.indexname).join(', '));
  await c.end();
})();
