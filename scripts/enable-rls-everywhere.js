const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
const { Client } = require('pg');

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const tabs = (await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  for (const t of tabs) {
    await c.query(`ALTER TABLE "${t.tablename}" ENABLE ROW LEVEL SECURITY`);
    // Belt-and-suspenders: also FORCE so even table owner obeys policies (service_role still bypasses)
    await c.query(`ALTER TABLE "${t.tablename}" FORCE ROW LEVEL SECURITY`);
    console.log(`  ✓ RLS on ${t.tablename}`);
  }
  await c.end();
  console.log(`\nEnabled RLS on ${tabs.length} tables.`);
})().catch(e => { console.error(e); process.exit(1); });
