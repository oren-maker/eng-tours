const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

(async () => {
  const c = new Client({
    host: 'db.ijeauuonjtskughxtmic.supabase.co',
    port: 5432, database: 'postgres', user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // 1. Add participant payment columns
  await c.query(`
    ALTER TABLE participants
      ADD COLUMN IF NOT EXISTS payment_method TEXT,
      ADD COLUMN IF NOT EXISTS payment_card_last4 TEXT,
      ADD COLUMN IF NOT EXISTS payment_confirmation TEXT,
      ADD COLUMN IF NOT EXISTS payment_date DATE,
      ADD COLUMN IF NOT EXISTS payer_participant_id UUID;
  `);
  console.log('columns added');

  // 2. Compute per-participant item cost (flight + room + ticket, company prices for simplicity)
  //    Half the orders (by row number) → split: each participant pays for themselves
  //    Other half → single: first participant pays for everyone

  // Get all orders with participants & prices
  const { rows: orders } = await c.query(`
    SELECT o.id AS order_id, o.total_price, o.amount_paid, o.status,
           ROW_NUMBER() OVER (ORDER BY o.created_at) AS rn
      FROM orders o
     WHERE o.status NOT IN ('cancelled', 'draft')
  `);

  let splitCount = 0, singleCount = 0, partCount = 0;
  for (const o of orders) {
    const { rows: parts } = await c.query(`
      SELECT p.id,
             COALESCE(f.price_customer, 0) AS f_price,
             COALESCE(r.price_customer, 0) AS r_price,
             COALESCE(t.price_customer, 0) AS t_price
        FROM participants p
        LEFT JOIN flights f ON f.id = p.flight_id
        LEFT JOIN rooms r ON r.id = p.room_id
        LEFT JOIN tickets t ON t.id = p.ticket_id
       WHERE p.order_id = $1
       ORDER BY p.id
    `, [o.order_id]);

    if (parts.length === 0) continue;

    const totalPaid = Number(o.amount_paid) || 0;
    const total = Number(o.total_price) || 0;
    const paidRatio = total > 0 ? totalPaid / total : 1;

    // Split logic: multi-participant → half split, half single; single-participant → always single
    const isSplit = parts.length >= 2 && o.rn % 2 === 0;

    if (isSplit) {
      splitCount++;
      // Each participant pays their own share of their items, × paidRatio
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const itemCost = Number(p.f_price) + Number(p.r_price) + Number(p.t_price);
        const paid = Math.round(itemCost * paidRatio * 100) / 100;
        const methods = ['credit', 'credit', 'credit', 'transfer']; // mostly credit
        const method = methods[i % methods.length];
        const last4 = method === 'credit' ? String(1000 + (Math.abs(hashCode(p.id)) % 9000)) : null;
        const confirmation = 'PAY-' + String(100000 + (Math.abs(hashCode(p.id + 'x')) % 900000));
        await c.query(`
          UPDATE participants
             SET amount_paid = $1,
                 payment_method = $2,
                 payment_card_last4 = $3,
                 payment_confirmation = $4,
                 payment_date = CURRENT_DATE,
                 payer_participant_id = id
           WHERE id = $5
        `, [paid, method, last4, confirmation, p.id]);
        partCount++;
      }
    } else {
      singleCount++;
      // First participant pays total × paidRatio for everyone
      const payer = parts[0];
      const methods = ['credit', 'transfer', 'cash'];
      const method = methods[Math.abs(hashCode(o.order_id)) % methods.length];
      const last4 = method === 'credit' ? String(1000 + (Math.abs(hashCode(o.order_id)) % 9000)) : null;
      const confirmation = 'PAY-' + String(100000 + (Math.abs(hashCode(o.order_id)) % 900000));

      await c.query(`
        UPDATE participants
           SET amount_paid = $1,
               payment_method = $2,
               payment_card_last4 = $3,
               payment_confirmation = $4,
               payment_date = CURRENT_DATE,
               payer_participant_id = $5
         WHERE id = $5
      `, [totalPaid, method, last4, confirmation, payer.id]);

      // Non-payers → amount_paid=0, payer_participant_id=payer.id
      await c.query(`
        UPDATE participants
           SET amount_paid = 0,
               payment_method = NULL,
               payment_card_last4 = NULL,
               payment_confirmation = NULL,
               payment_date = NULL,
               payer_participant_id = $1
         WHERE order_id = $2 AND id != $1
      `, [payer.id, o.order_id]);
      partCount += parts.length;
    }
  }

  function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return h;
  }

  console.log('orders split:', splitCount, 'single:', singleCount, 'participants updated:', partCount);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
