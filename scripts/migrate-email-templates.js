const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT UNIQUE NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      variables TEXT[] DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('email_templates table ready');
  await c.end();
})();
