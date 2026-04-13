const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

function randomPhone() {
  const prefixes = ['050', '052', '053', '054', '055', '058'];
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const n = String(Math.floor(1000000 + Math.random() * 9000000));
  return '+972' + p.slice(1) + n;
}
function randomEmail(name) {
  const domains = ['gmail.com', 'walla.co.il', 'hotmail.com', 'yahoo.com'];
  const slug = (name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'user';
  return `${slug}${Math.floor(Math.random() * 1000)}@${domains[Math.floor(Math.random() * domains.length)]}`;
}
function randomDate(yearsFromNow, range) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + yearsFromNow + Math.floor(Math.random() * range));
  d.setMonth(Math.floor(Math.random() * 12));
  d.setDate(1 + Math.floor(Math.random() * 28));
  return d.toISOString().slice(0, 10);
}
function randomBirth() {
  // age 18-65
  const age = 18 + Math.floor(Math.random() * 48);
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setMonth(Math.floor(Math.random() * 12));
  d.setDate(1 + Math.floor(Math.random() * 28));
  return d.toISOString().slice(0, 10);
}
function calcAge(birth) {
  const b = new Date(birth);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

(async () => {
  const c = new Client({
    host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // Get all orders with participants
  const { rows: orders } = await c.query(`
    SELECT o.id, o.created_at, ROW_NUMBER() OVER (ORDER BY o.created_at) AS rn
      FROM orders o
     WHERE o.status NOT IN ('draft')
  `);

  let updatedCount = 0;
  let sharedCount = 0, separateCount = 0;

  for (const o of orders) {
    const { rows: parts } = await c.query(
      `SELECT id, first_name_en, birth_date, passport_expiry, phone, email FROM participants WHERE order_id=$1 ORDER BY id`,
      [o.id]
    );
    if (parts.length === 0) continue;

    // Half orders share contact, half separate
    const share = o.rn % 2 === 0;
    if (share) sharedCount++; else separateCount++;

    // Generate primary phone/email (used if shared)
    const primaryPhone = randomPhone();
    const primaryEmail = randomEmail(parts[0].first_name_en);

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const updates = {};
      if (!p.passport_expiry) updates.passport_expiry = randomDate(2, 8); // 2-10 years from now
      if (!p.birth_date) updates.birth_date = randomBirth();
      const birthDate = updates.birth_date || p.birth_date;
      const age = birthDate ? calcAge(birthDate) : null;
      if (age) updates.age_at_event = age;

      // Phone/email
      if (share) {
        updates.phone = primaryPhone;
        updates.email = primaryEmail;
      } else {
        // each gets their own (only fill if missing)
        if (!p.phone) updates.phone = randomPhone();
        if (!p.email) updates.email = randomEmail(p.first_name_en);
      }

      if (Object.keys(updates).length === 0) continue;

      const fields = Object.keys(updates);
      const values = fields.map((f) => updates[f]);
      const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
      await c.query(`UPDATE participants SET ${setClause} WHERE id = $1`, [p.id, ...values]);
      updatedCount++;
    }
  }

  console.log({ updated: updatedCount, sharedOrders: sharedCount, separateOrders: separateCount });
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
