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

  // Insert rows for each participant that has amount_paid > 0 but no corresponding payments row yet
  const r = await c.query(`
    INSERT INTO payments (order_id, participant_id, amount, method, card_last4, confirmation, payment_date)
    SELECT p.order_id, p.id, p.amount_paid, p.payment_method, p.payment_card_last4, p.payment_confirmation, p.payment_date
      FROM participants p
     WHERE p.amount_paid > 0
       AND NOT EXISTS (
         SELECT 1 FROM payments pm WHERE pm.participant_id = p.id
       )
     RETURNING id;
  `);
  console.log('migrated payments:', r.rowCount);

  await c.end();
})();
