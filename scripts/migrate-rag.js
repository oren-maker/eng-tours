const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '').trim(); }
(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(fs.readFileSync('supabase/migrations/20260419_rag.sql', 'utf8'));
  const ext = await c.query(`SELECT extname, extversion FROM pg_extension WHERE extname='vector'`);
  console.log('pgvector:', ext.rows[0] || 'not installed');
  const tables = await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('rag_documents','rag_queries')`);
  console.log('tables:', tables.rows.map(r => r.table_name).join(', '));
  await c.end();
})();
