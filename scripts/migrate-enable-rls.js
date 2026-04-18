const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(fs.readFileSync('supabase/migrations/20260418_enable_rls.sql', 'utf8'));
  const r = await c.query(`
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
    ORDER BY c.relname`);
  const off = r.rows.filter(r => !r.relrowsecurity).map(r => r.relname);
  console.log('Total tables:', r.rows.length, '| RLS enabled:', r.rows.length - off.length, '| still off:', off.length ? off.join(', ') : 'none');
  await c.end();
})();
