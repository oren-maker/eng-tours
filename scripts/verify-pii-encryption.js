const { Client } = require('pg');
const fs = require('fs');
const crypto = require('crypto');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }

const KEY = Buffer.from(process.env.PII_ENCRYPTION_KEY, 'base64');

function decrypt(blob) {
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12), tag = buf.subarray(12, 28), ct = buf.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const total = await c.query(`SELECT count(*)::int FROM participants WHERE passport_number IS NOT NULL AND passport_number <> ''`);
  const encCount = await c.query(`SELECT count(*)::int FROM participants WHERE passport_number_enc IS NOT NULL`);
  const pending = await c.query(`SELECT count(*)::int FROM participants WHERE passport_number IS NOT NULL AND passport_number <> '' AND passport_number_enc IS NULL`);
  console.log(`plaintext rows: ${total.rows[0].count}`);
  console.log(`encrypted rows: ${encCount.rows[0].count}`);
  console.log(`still pending:  ${pending.rows[0].count}`);

  const { rows: samples } = await c.query(`
    SELECT passport_number, passport_number_enc FROM participants
    WHERE passport_number_enc IS NOT NULL ORDER BY random() LIMIT 5
  `);
  let matches = 0;
  for (const s of samples) {
    if (decrypt(s.passport_number_enc) === s.passport_number) matches++;
  }
  console.log(`round-trip ${matches}/${samples.length} match`);
  await c.end();
})();
