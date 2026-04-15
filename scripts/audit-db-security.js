const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
const { Client } = require('pg');

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();

  console.log('=== TABLES / ROW COUNTS ===');
  const tables = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  for (const t of tables.rows) {
    const r = await c.query(`SELECT count(*)::int FROM "${t.tablename}"`);
    console.log('  ' + t.tablename.padEnd(30), r.rows[0].count);
  }

  console.log('\n=== RLS STATUS (public schema) ===');
  const rls = await c.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const noRls = [];
  for (const r of rls.rows) {
    console.log('  ' + r.tablename.padEnd(30), r.rowsecurity ? '🔒 ON' : '🔓 OFF');
    if (!r.rowsecurity) noRls.push(r.tablename);
  }
  console.log(`  → ${noRls.length} tables WITHOUT RLS`);

  console.log('\n=== INDEXES COUNT PER TABLE ===');
  const idx = await c.query(`SELECT tablename, count(*)::int cnt FROM pg_indexes WHERE schemaname='public' GROUP BY tablename ORDER BY cnt DESC`);
  for (const r of idx.rows) console.log('  ' + r.tablename.padEnd(30), r.cnt);

  console.log('\n=== ORPHAN FK CHECKS ===');
  const checks = [
    ['participants', 'order_id', 'orders', 'id'],
    ['email_log', 'order_id', 'orders', 'id'],
    ['sms_log', 'order_id', 'orders', 'id'],
    ['whatsapp_log', 'order_id', 'orders', 'id'],
    ['otp_codes', 'user_id', 'users', 'id'],
    ['supplier_confirmations', 'order_id', 'orders', 'id'],
    ['payments', 'order_id', 'orders', 'id'],
  ];
  for (const [child, fk, parent, pk] of checks) {
    try {
      const r = await c.query(`SELECT count(*)::int FROM "${child}" WHERE ${fk} IS NOT NULL AND ${fk} NOT IN (SELECT ${pk} FROM "${parent}")`);
      const mark = r.rows[0].count === 0 ? '✓' : '⚠';
      console.log(`  ${mark} ${child}.${fk} → ${parent}: ${r.rows[0].count} orphan`);
    } catch (e) { console.log(`  · ${child}: ${e.message.slice(0, 60)}`); }
  }

  console.log('\n=== USERS / AUTH ===');
  const users = await c.query("SELECT role, count(*)::int, bool_or(password_hash IS NOT NULL) has_hash, bool_or(two_factor_enabled) any_2fa FROM users GROUP BY role");
  for (const u of users.rows) console.log('  role=' + (u.role || 'null'), 'count=' + u.count, 'has_hash=' + u.has_hash, 'any_2fa=' + u.any_2fa);

  console.log('\n=== PASSWORD HASH INTEGRITY ===');
  const pw = await c.query(`SELECT count(*)::int as plain FROM users WHERE password_hash IS NOT NULL AND password_hash NOT LIKE '$%'`);
  console.log('  users with non-bcrypt hash (bad):', pw.rows[0].plain);
  const failed = await c.query(`SELECT count(*)::int FROM users WHERE failed_login_count >= 5`);
  console.log('  users currently locked (>=5 failed):', failed.rows[0].count);

  console.log('\n=== SENSITIVE COLUMNS (PII stored in cleartext?) ===');
  const sensitive = await c.query(`SELECT count(*)::int FROM participants WHERE passport_number IS NOT NULL`);
  console.log('  participants with passport_number stored:', sensitive.rows[0].count);

  console.log('\n=== LARGE PAYLOAD TABLES ===');
  const sizes = await c.query(`SELECT relname, pg_size_pretty(pg_total_relation_size(oid)) size, pg_total_relation_size(oid) bytes FROM pg_class WHERE relkind='r' AND relnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public') ORDER BY bytes DESC LIMIT 10`);
  for (const r of sizes.rows) console.log('  ' + r.relname.padEnd(30), r.size);

  console.log('\n=== AUDIT LOG FRESHNESS ===');
  const audit = await c.query(`SELECT count(*)::int total, max(created_at) last FROM audit_log`);
  console.log('  total:', audit.rows[0].total, 'last:', audit.rows[0].last);

  console.log('\n=== OTP / 2FA HYGIENE ===');
  const otp = await c.query(`SELECT count(*) FILTER (WHERE expires_at < now() AND consumed_at IS NULL)::int expired_unused, count(*)::int total FROM otp_codes`);
  console.log('  otp total:', otp.rows[0].total, '| expired+unused:', otp.rows[0].expired_unused);

  console.log('\n=== PUBLIC/ANON ACCESS VIA ANON_KEY? ===');
  // Use the anon key to attempt reads of sensitive tables. This simulates what an attacker would see from the browser.
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const sb = createClient(url, anon);
    const tabs = ['users', 'orders', 'participants', 'email_log', 'whatsapp_log', 'sms_log', 'otp_codes', 'audit_log', 'system_settings'];
    for (const t of tabs) {
      const { data, error, count } = await sb.from(t).select('*', { count: 'exact', head: true });
      if (error) console.log(`  ✓ ${t.padEnd(20)} blocked: ${error.message.slice(0, 50)}`);
      else console.log(`  ⚠ ${t.padEnd(20)} PUBLIC READ: count=${count}`);
    }
  } else {
    console.log('  (no anon key loaded, skipping)');
  }

  console.log('\n=== STORAGE BUCKETS ===');
  const buckets = await c.query(`SELECT id, name, public FROM storage.buckets ORDER BY name`);
  for (const b of buckets.rows) console.log('  ' + b.name.padEnd(20), b.public ? '🔓 PUBLIC' : '🔒 private');

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
