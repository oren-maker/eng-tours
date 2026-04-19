const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
(async () => {
  // Log in
  const csrfR = await fetch('https://eng-tours.vercel.app/api/auth/csrf');
  const { csrfToken } = await csrfR.json();
  const setCookies = csrfR.headers.getSetCookie();
  let cookies = setCookies.map(c => c.split(';')[0]).join('; ');
  const loginR = await fetch('https://eng-tours.vercel.app/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
    body: new URLSearchParams({ csrfToken, email: 'oren@bin.co.il', password: 'oren12345', json: 'true' }).toString(),
    redirect: 'manual',
  });
  const loginCookies = loginR.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  cookies = cookies + '; ' + loginCookies;

  // Pick an order with a participant having passport_number
  const { Client } = require('pg');
  const pg = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  const { rows } = await pg.query(`SELECT order_id, passport_number, passport_number_enc FROM participants WHERE passport_number_enc IS NOT NULL AND passport_number IS NOT NULL AND order_id IS NOT NULL LIMIT 1`);
  await pg.end();
  if (!rows.length) { console.log('no encrypted participant found'); return; }
  const sample = rows[0];
  console.log('sample order_id:', sample.order_id);
  console.log('plaintext in DB:', sample.passport_number);
  console.log('ciphertext len:', sample.passport_number_enc.length);

  // Fetch via API
  const r = await fetch(`https://eng-tours.vercel.app/api/orders/${sample.order_id}`, { headers: { Cookie: cookies } });
  if (!r.ok) { console.log('api status:', r.status); return; }
  const data = await r.json();
  const p = (data.order?.participants || []).find(x => x.passport_number_enc === sample.passport_number_enc);
  if (!p) { console.log('participant not returned'); return; }
  console.log('returned passport_number:', p.passport_number);
  console.log('decrypt match:', p.passport_number === sample.passport_number ? 'YES ✓' : 'NO ✗');
})();
