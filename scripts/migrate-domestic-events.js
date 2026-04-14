const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Add is_domestic column
  await c.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_domestic BOOLEAN DEFAULT false;`);

  // Compute: IL (מלון בארץ), FI (מלון + טיסות בארץ) => domestic
  //          RF, FL, RL => abroad
  await c.query(`
    UPDATE events
       SET is_domestic = CASE
         WHEN type_code IN ('IL', 'FI') THEN true
         WHEN destination_country IS NOT NULL AND LOWER(destination_country) IN ('ישראל', 'israel', 'il') THEN true
         ELSE false
       END
  `);
  const check = await c.query(`SELECT is_domestic, COUNT(*) FROM events GROUP BY is_domestic`);
  console.log('after initial compute:', check.rows);

  // Add doc-type columns to participants
  await c.query(`
    ALTER TABLE participants
      ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'passport';
  `);

  // Flip half the RL events to FI (domestic) for testing — but keep dates etc.
  // Actually: convert ~half of non-domestic events to domestic by changing type_code + country + is_domestic
  const { rows: nonDom } = await c.query(`SELECT id FROM events WHERE is_domestic = false ORDER BY created_at`);
  const toFlip = nonDom.slice(0, Math.ceil(nonDom.length / 2));
  for (const ev of toFlip) {
    await c.query(`
      UPDATE events
         SET type_code = 'FI',
             destination_country = 'ישראל',
             is_domestic = true
       WHERE id = $1
    `, [ev.id]);
  }
  console.log('flipped', toFlip.length, 'events to domestic');

  const after = await c.query(`SELECT is_domestic, COUNT(*) FROM events GROUP BY is_domestic`);
  console.log('after flip:', after.rows);

  await c.end();
})();
