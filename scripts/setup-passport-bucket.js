const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ijeauuonjtskughxtmic.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

(async () => {
  if (!SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }
  // Create bucket via Supabase Storage API
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'passports', name: 'passports', public: false, file_size_limit: 10 * 1024 * 1024 }),
  });
  const body = await res.text();
  console.log('status:', res.status, body);
})();
