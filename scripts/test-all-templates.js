// Sends every WhatsApp template to a single test number using WaSender API.
// Pulls templates from DB, finds connected session, sends with sample variables, logs each.
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const l of env.split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
const { Client } = require('pg');

const TEST_PHONE = '+972524802830';
const PAT = process.env.WASENDER_API_KEY;
const BASE = process.env.WASENDER_API_URL || 'https://wasenderapi.com/api';

if (!PAT) { console.error('Missing WASENDER_API_KEY'); process.exit(1); }

const sample = {
  code: '123456', date: new Date().toLocaleDateString('he-IL'),
  n: '5', link: 'https://eng-tours.vercel.app/test',
  item_name: 'מלון מרינה', id: 'TEST123',
  event_name: 'פסטיבל אביב', confirmation: 'CONF-9988',
  name: 'בדיקה',
};

function applyTemplate(body, vars) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

async function listSessions() {
  const res = await fetch(`${BASE}/whatsapp-sessions`, { headers: { Authorization: `Bearer ${PAT}` } });
  const d = await res.json();
  return d?.data || [];
}

async function sendOne(sessionKey, text) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/send-message`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: TEST_PHONE, text }),
  });
  const d = await res.json();
  return { ok: res.ok, status: res.status, ms: Date.now() - t0, response: d };
}

(async () => {
  const sessions = await listSessions();
  const session = sessions.find(s => ['connected', 'ready'].includes((s.status || '').toLowerCase()));
  if (!session) { console.error('No connected session found'); process.exit(1); }
  console.log(`Using session: ${session.name} (${session.phone_number}) status=${session.status}`);
  console.log(`Test phone: ${TEST_PHONE}\n`);

  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const { rows: templates } = await c.query('SELECT name, body FROM whatsapp_templates ORDER BY name');

  const results = [];
  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    const text = `[${i + 1}/${templates.length}] בדיקה: ${t.name}\n\n` + applyTemplate(t.body, sample);
    const ts = new Date().toISOString();
    process.stdout.write(`${(i+1).toString().padStart(2,'0')}. ${t.name.padEnd(28)} ... `);
    const r = await sendOne(session.api_key, text);
    const ok = r.ok && r.response?.success !== false;
    process.stdout.write(`${ok ? '✓' : '✗'} (${r.ms}ms)\n`);
    if (!ok) console.log('   error:', JSON.stringify(r.response));

    // Log to DB
    await c.query(`
      INSERT INTO whatsapp_log (direction, recipient, recipient_number, template_name, message_body, status, external_id, error_message)
      VALUES ('outgoing', $1, $1, $2, $3, $4, $5, $6)
    `, [TEST_PHONE.replace('+',''), t.name, text, ok ? 'sent' : 'failed', r.response?.data?.msgId?.toString() || null, ok ? null : JSON.stringify(r.response)]);

    results.push({ idx: i + 1, name: t.name, ts, ok, msgId: r.response?.data?.msgId, error: ok ? null : (r.response?.message || JSON.stringify(r.response)) });
    await new Promise(r => setTimeout(r, 6000)); // 6s delay (account protection: 1/5s)
  }

  console.log('\n========== סיכום ==========');
  console.log('עברו: ' + results.filter(r=>r.ok).length + '/' + results.length);
  console.log('\nפירוט:');
  for (const r of results) {
    const time = new Date(r.ts).toLocaleTimeString('he-IL');
    console.log(`${r.ok ? '✓' : '✗'} ${time} | ${r.name.padEnd(28)} ${r.ok ? 'msgId='+r.msgId : 'שגיאה: '+r.error}`);
  }
  await c.end();
})();
