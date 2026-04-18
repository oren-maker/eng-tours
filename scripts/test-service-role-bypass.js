// Test that sb_secret_ service role actually bypasses RLS before enabling it.
// Enables RLS on ONE test table, queries via sb_secret_, then disables.
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }

(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('URL:', url);
  console.log('Secret prefix:', secret?.slice(0, 12));
  console.log('Anon prefix:', anon?.slice(0, 12));

  const pg = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  // Enable RLS on a benign table
  console.log('\n--- Enabling RLS on users (test) ---');
  await pg.query(`ALTER TABLE public.users ENABLE ROW LEVEL SECURITY`);

  // Test with sb_secret_ (should bypass RLS and return rows)
  const secretClient = createClient(url, secret, { auth: { persistSession: false } });
  const { data: secretRows, error: secretErr } = await secretClient.from('users').select('id').limit(1);
  console.log('secret result:', secretErr ? `ERROR: ${secretErr.message}` : `OK (${secretRows?.length ?? 0} rows)`);

  // Test with anon (should return 0 rows because no policy allows)
  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: anonRows, error: anonErr } = await anonClient.from('users').select('id').limit(1);
  console.log('anon result:', anonErr ? `ERROR: ${anonErr.message}` : `OK (${anonRows?.length ?? 0} rows - should be 0)`);

  // Revert
  console.log('\n--- Reverting ---');
  await pg.query(`ALTER TABLE public.users DISABLE ROW LEVEL SECURITY`);
  await pg.end();
  console.log('Done. If secret returned rows and anon returned 0 — service_role bypasses correctly.');
})();
