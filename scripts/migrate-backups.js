const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS backups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      trigger TEXT NOT NULL CHECK (trigger IN ('auto', 'manual')),
      status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
      size_bytes BIGINT,
      tables_count INT,
      rows_count INT,
      storage_path TEXT,
      error_msg TEXT,
      duration_ms INT
    );
    CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups (created_at DESC);
  `);
  const { rows } = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='backups'`);
  console.log('migration done. columns:', rows.map(r => r.column_name).join(', '));
  await c.end();
})();
