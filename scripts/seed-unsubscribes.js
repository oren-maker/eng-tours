const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }

const demo = [
  { email: 'dana.cohen@gmail.com', reason: 'too_many_emails', source: 'unsubscribe_link', daysAgo: 1 },
  { email: 'yossi.levi@walla.co.il', reason: 'not_relevant', source: 'unsubscribe_link', daysAgo: 3 },
  { email: 'maya.biton@outlook.com', reason: 'too_many_emails', source: 'unsubscribe_link', daysAgo: 5 },
  { email: 'eitan.friedman@gmail.com', reason: 'never_signed_up', source: 'unsubscribe_link', daysAgo: 7 },
  { email: 'noa.azulay@icloud.com', reason: 'too_many_emails', source: 'unsubscribe_link', daysAgo: 10 },
  { email: 'ron.katz@hotmail.com', reason: 'not_relevant', source: 'admin', daysAgo: 14 },
  { email: 'tamar.shalev@gmail.com', reason: 'other', source: 'unsubscribe_link', daysAgo: 18 },
  { email: 'amir.mizrahi@walla.co.il', reason: 'too_many_emails', source: 'unsubscribe_link', daysAgo: 22 },
  { email: 'shira.green@gmail.com', reason: 'never_signed_up', source: 'unsubscribe_link', daysAgo: 28 },
  { email: 'gal.rosenberg@gmail.com', reason: 'not_relevant', source: 'unsubscribe_link', daysAgo: 35 },
];

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // inspect schema
  const { rows: cols } = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='email_unsubscribes'`);
  console.log('columns:', cols.map(r => r.column_name).join(', '));

  for (const d of demo) {
    const ts = new Date(Date.now() - d.daysAgo * 86400000).toISOString();
    await c.query(
      `INSERT INTO email_unsubscribes (email, reason, source, unsubscribed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET reason=EXCLUDED.reason, source=EXCLUDED.source, unsubscribed_at=EXCLUDED.unsubscribed_at`,
      [d.email, d.reason, d.source, ts]
    );
  }
  const { rows } = await c.query(`SELECT count(*) FROM email_unsubscribes`);
  console.log('total rows:', rows[0].count);
  await c.end();
})();
