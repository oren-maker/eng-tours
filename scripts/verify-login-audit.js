const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    SELECT action, user_id, created_at, after_data
    FROM audit_log
    WHERE action IN ('login_success','login_failed','login_locked')
    ORDER BY created_at DESC LIMIT 10`);
  console.log(`recent login events: ${r.rows.length}`);
  for (const row of r.rows) {
    console.log(`  ${row.created_at.toISOString()} | ${row.action} | ${row.user_id} | ${JSON.stringify(row.after_data)}`);
  }
  await c.end();
})();
