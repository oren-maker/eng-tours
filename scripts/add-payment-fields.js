const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

(async () => {
  const c = new Client({
    host: 'db.ijeauuonjtskughxtmic.supabase.co',
    port: 5432, database: 'postgres', user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query(`
    ALTER TABLE supplier_confirmations
      ADD COLUMN IF NOT EXISTS payment_amount NUMERIC,
      ADD COLUMN IF NOT EXISTS payment_currency TEXT,
      ADD COLUMN IF NOT EXISTS payment_method TEXT,
      ADD COLUMN IF NOT EXISTS payment_installments INTEGER,
      ADD COLUMN IF NOT EXISTS payment_confirmation TEXT,
      ADD COLUMN IF NOT EXISTS payment_date DATE,
      ADD COLUMN IF NOT EXISTS payment_due_date DATE;
  `);
  console.log('Payment fields added');
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
