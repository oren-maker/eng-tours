const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const r = await c.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname='public'
      AND tablename IN ('whatsapp_log','sms_log','email_log','email_unsubscribe_log','orders','participants','audit_log','backups','users','events','order_participants','order_items')
    ORDER BY tablename, indexname`);
  for (const row of r.rows) console.log(row.tablename + ' | ' + row.indexname + ' | ' + row.indexdef.replace(/^CREATE.*? ON /,'ON '));
  await c.end();
})();
