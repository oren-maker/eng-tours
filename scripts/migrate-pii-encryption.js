const { Client } = require('pg');
const fs = require('fs');
const crypto = require('crypto');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }

const KEY_B64 = process.env.PII_ENCRYPTION_KEY;
if (!KEY_B64) { console.error('PII_ENCRYPTION_KEY missing in .env.local'); process.exit(1); }
const KEY = Buffer.from(KEY_B64, 'base64');
if (KEY.length !== 32) { console.error(`KEY wrong length: ${KEY.length}`); process.exit(1); }

function encrypt(text) {
  if (text == null || text === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

function decrypt(blob) {
  if (!blob) return null;
  const buf = Buffer.from(blob, 'base64');
  const iv = buf.subarray(0, 12), tag = buf.subarray(12, 28), ct = buf.subarray(28);
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Apply schema
  await c.query(fs.readFileSync('supabase/migrations/20260419_pii_encryption.sql', 'utf8'));
  console.log('schema ok');

  // Fetch rows needing encryption
  const { rows } = await c.query(`
    SELECT id, passport_number
    FROM participants
    WHERE passport_number IS NOT NULL AND passport_number <> '' AND passport_number_enc IS NULL
  `);
  console.log(`rows to encrypt: ${rows.length}`);

  let done = 0;
  for (const row of rows) {
    const enc = encrypt(row.passport_number);
    await c.query(`UPDATE participants SET passport_number_enc=$1 WHERE id=$2`, [enc, row.id]);
    done++;
    if (done % 100 === 0) console.log(`  encrypted ${done}/${rows.length}`);
  }
  console.log(`encrypted: ${done}`);

  // Verify: pick 3 random rows, decrypt, compare
  const { rows: samples } = await c.query(`
    SELECT passport_number, passport_number_enc FROM participants
    WHERE passport_number IS NOT NULL AND passport_number_enc IS NOT NULL
    ORDER BY random() LIMIT 3
  `);
  let matches = 0;
  for (const s of samples) {
    if (decrypt(s.passport_number_enc) === s.passport_number) matches++;
  }
  console.log(`round-trip verification: ${matches}/${samples.length} match`);

  await c.end();
  process.exit(matches === samples.length ? 0 : 1);
})();
