const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
(async () => {
  const c = new Client({ host:'db.ijeauuonjtskughxtmic.supabase.co', port:5432, database:'postgres', user:'postgres', password:process.env.SUPABASE_DB_PASSWORD, ssl:{rejectUnauthorized:false} });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
      amount NUMERIC(10,2) NOT NULL,
      method TEXT,
      card_last4 TEXT,
      confirmation TEXT,
      payment_date DATE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
  `);
  console.log('payments table ready');
  await c.end();
})();
