// Exhaustive decryption verification.
// Decrypts EVERY encrypted row and checks byte-for-byte match with plaintext.
const { Client } = require('pg');
const fs = require('fs');
const crypto = require('crypto');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }

const KEY = Buffer.from(process.env.PII_ENCRYPTION_KEY, 'base64');

function decrypt(blob) {
  try {
    const buf = Buffer.from(blob, 'base64');
    if (buf.length < 29) return { ok: false, error: 'too short' };
    const iv = buf.subarray(0, 12), tag = buf.subarray(12, 28), ct = buf.subarray(28);
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    d.setAuthTag(tag);
    const pt = Buffer.concat([d.update(ct), d.final()]).toString('utf8');
    return { ok: true, pt };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const t0 = Date.now();
  const { rows } = await c.query(`
    SELECT id, passport_number, passport_number_enc
    FROM participants
    WHERE passport_number_enc IS NOT NULL
    ORDER BY id
  `);

  let total = rows.length;
  let match = 0;
  let mismatch = 0;
  let decryptFail = 0;
  const mismatchSamples = [];
  const failSamples = [];
  const uniquePlain = new Set();
  const uniqueCipher = new Set();

  for (const row of rows) {
    uniquePlain.add(row.passport_number);
    uniqueCipher.add(row.passport_number_enc);
    const r = decrypt(row.passport_number_enc);
    if (!r.ok) {
      decryptFail++;
      if (failSamples.length < 3) failSamples.push({ id: row.id, error: r.error });
      continue;
    }
    if (r.pt === row.passport_number) {
      match++;
    } else {
      mismatch++;
      if (mismatchSamples.length < 3) {
        mismatchSamples.push({ id: row.id, plaintext: row.passport_number, decrypted: r.pt });
      }
    }
  }

  const elapsed = Date.now() - t0;

  console.log(`\n=== Exhaustive decryption verification ===`);
  console.log(`Total rows: ${total}`);
  console.log(`✓ match    : ${match}`);
  console.log(`✗ mismatch : ${mismatch}`);
  console.log(`✗ fail     : ${decryptFail}`);
  console.log(`unique plaintexts : ${uniquePlain.size}`);
  console.log(`unique ciphertexts: ${uniqueCipher.size} (should be >= plaintexts due to random IV)`);
  console.log(`elapsed: ${elapsed}ms (${(elapsed / total).toFixed(2)}ms/row)`);

  if (failSamples.length > 0) {
    console.log('\nFAIL samples:');
    for (const s of failSamples) console.log(`  id=${s.id}: ${s.error}`);
  }
  if (mismatchSamples.length > 0) {
    console.log('\nMISMATCH samples:');
    for (const s of mismatchSamples) console.log(`  id=${s.id}: plaintext="${s.plaintext}" decrypted="${s.decrypted}"`);
  }

  // Edge cases
  console.log('\n=== Edge case tests ===');

  // 1. Empty string round-trip
  const crypto2 = require('crypto');
  function encrypt(text) {
    if (text == null || text === '') return null;
    const iv = crypto2.randomBytes(12);
    const cipher = crypto2.createCipheriv('aes-256-gcm', KEY, iv);
    const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
  }

  const empty = encrypt('');
  console.log(`encrypt('') === null: ${empty === null ? '✓' : '✗'}`);

  const nullIn = encrypt(null);
  console.log(`encrypt(null) === null: ${nullIn === null ? '✓' : '✗'}`);

  // 2. Hebrew round-trip
  const hebrew = 'אבגדה123';
  const encHeb = encrypt(hebrew);
  const decHeb = decrypt(encHeb).pt;
  console.log(`Hebrew round-trip: ${decHeb === hebrew ? '✓' : '✗'} ("${hebrew}" → "${decHeb}")`);

  // 3. Long string (simulate full-name+passport concat worst case)
  const long = 'A'.repeat(500);
  const decLong = decrypt(encrypt(long)).pt;
  console.log(`500-char round-trip: ${decLong === long ? '✓' : '✗'}`);

  // 4. Bad base64 → graceful null
  const badBase = decrypt('this-is-not-base64!!!');
  console.log(`bad base64 → safe fail: ${!badBase.ok ? '✓' : '✗'}`);

  // 5. Wrong key simulation: flip one byte of ciphertext → should fail auth tag
  const orig = encrypt('123456789');
  const buf = Buffer.from(orig, 'base64');
  buf[28] ^= 0xff; // flip first ct byte
  const tampered = decrypt(buf.toString('base64'));
  console.log(`tampered ciphertext → rejected: ${!tampered.ok ? '✓' : '✗'}`);

  // 6. Different IV → different ciphertext (randomness check)
  const a = encrypt('same-input');
  const b = encrypt('same-input');
  console.log(`same plaintext → different ciphertexts: ${a !== b ? '✓' : '✗'}`);

  await c.end();

  const allPassed = match === total && mismatch === 0 && decryptFail === 0;
  console.log(`\n${allPassed ? '✅ ALL DECRYPTIONS VERIFIED' : '❌ FAILURES DETECTED'}`);
  process.exit(allPassed ? 0 : 1);
})();
