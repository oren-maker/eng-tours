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

  // Drop strict check constraints + add missing columns
  await c.query(`
    ALTER TABLE whatsapp_log DROP CONSTRAINT IF EXISTS whatsapp_log_direction_check;
    ALTER TABLE whatsapp_log DROP CONSTRAINT IF EXISTS whatsapp_log_status_check;
    ALTER TABLE whatsapp_log DROP CONSTRAINT IF EXISTS whatsapp_log_recipient_type_check;
    ALTER TABLE whatsapp_log ADD COLUMN IF NOT EXISTS recipient TEXT;
    ALTER TABLE whatsapp_log ADD COLUMN IF NOT EXISTS external_id TEXT;
    ALTER TABLE whatsapp_log ADD COLUMN IF NOT EXISTS error_message TEXT;
    ALTER TABLE whatsapp_log ADD COLUMN IF NOT EXISTS raw_payload JSONB;
    UPDATE whatsapp_log SET recipient = recipient_number WHERE recipient IS NULL AND recipient_number IS NOT NULL;
  `);
  console.log('whatsapp_log schema updated');

  await c.end();
})();
