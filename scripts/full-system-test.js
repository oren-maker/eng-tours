// Full-system test. Exercises every admin + public endpoint.
// Run: node scripts/full-system-test.js [base-url]
const BASE = process.argv[2] || 'https://eng-tours.vercel.app';
const EMAIL = 'oren@bin.co.il';
const PASSWORD = 'oren12345';

const pass = []; const fail = [];

function ok(name, cond, detail = '') {
  if (cond) { pass.push(name); process.stdout.write(`\x1b[32m✓\x1b[0m ${name}\n`); }
  else      { fail.push({ name, detail }); process.stdout.write(`\x1b[31m✗\x1b[0m ${name}${detail ? ' — ' + detail : ''}\n`); }
}

function cookieJar() {
  const jar = {};
  return {
    set(sc) {
      if (!sc) return;
      const arr = Array.isArray(sc) ? sc : [sc];
      for (const c of arr) {
        const [kv] = c.split(';');
        const eq = kv.indexOf('=');
        if (eq > 0) jar[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim();
      }
    },
    header() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); },
  };
}

async function request(method, path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.cookies) headers.Cookie = opts.cookies;
  if (opts.body && typeof opts.body !== 'string') {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    headers.Origin = BASE;
    opts.body = JSON.stringify(opts.body);
  }
  const r = await fetch(`${BASE}${path}`, { method, headers, body: opts.body, redirect: 'manual' });
  let body = null;
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { body = await r.json(); } catch {}
  } else {
    try { body = await r.text(); } catch {}
  }
  return { status: r.status, headers: r.headers, body };
}

async function login(jar) {
  const csrfR = await fetch(`${BASE}/api/auth/csrf`);
  jar.set(csrfR.headers.getSetCookie?.());
  const { csrfToken } = await csrfR.json();
  const form = new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, json: 'true' });
  const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: jar.header() },
    body: form.toString(),
    redirect: 'manual',
  });
  jar.set(r.headers.getSetCookie?.());
  return r.status === 200 && jar.header().includes('session-token');
}

async function run() {
  console.log(`\n=== Full-system test: ${BASE} ===\n`);
  const jar = cookieJar();

  // ============ PUBLIC UNAUTH ============
  console.log('--- Public ---');
  { const r = await request('GET', '/login'); ok('GET /login 200', r.status === 200); }
  { const r = await request('GET', '/api/health'); ok('GET /api/health 200 + db ok', r.status === 200 && r.body?.ok === true && r.body?.db === 'ok'); }
  { const r = await request('GET', '/sitemap.xml'); ok('GET /sitemap.xml', r.status === 200 && typeof r.body === 'string' && r.body.includes('<urlset')); }
  { const r = await request('GET', '/robots.txt'); ok('GET /robots.txt', r.status === 200 && r.body?.includes?.('Disallow: /api/')); }
  { const r = await request('GET', '/.well-known/security.txt'); ok('security.txt', r.status === 200 && r.body?.includes?.('Contact:')); }
  { const r = await request('POST', '/api/coupons/validate', { body: { code: 'NONEXISTENT' } }); ok('POST /api/coupons/validate (invalid) non-5xx', r.status < 500); }
  { const r = await request('POST', '/api/unsubscribe', { body: { email: 'x@y.com', token: 'bad' } }); ok('POST /api/unsubscribe (bad token) 403', r.status === 403); }
  { const r = await request('GET', '/api/orders/token/invalid-token'); ok('GET /api/orders/token/invalid 404', r.status === 404); }
  { const r = await request('POST', '/api/pulseem/webhook', { body: {} }); ok('POST /api/pulseem/webhook unsigned 401/503', r.status === 401 || r.status === 503); }
  { const r = await request('POST', '/api/whatsapp/webhook', { body: {} }); ok('POST /api/whatsapp/webhook unsigned 401/503', r.status === 401 || r.status === 503); }

  // ============ UNAUTH -> AUTH REQUIRED ============
  console.log('\n--- Auth gate ---');
  const protectedGets = [
    '/api/events', '/api/airlines', '/api/hotels', '/api/flights', '/api/tickets', '/api/packages',
    '/api/orders', '/api/waiting-list', '/api/coupons', '/api/faq', '/api/audit', '/api/issues',
    '/api/settings', '/api/company-info', '/api/admin/backups',
    '/api/whatsapp/log', '/api/whatsapp/templates', '/api/whatsapp/sessions', '/api/whatsapp/health',
    '/api/email/templates', '/api/email/server-status', '/api/admin/email-log',
    '/api/admin/sms-log', '/api/admin/unsubscribes', '/api/admin/unsubscribes/history',
    '/api/admin/marketing/contacts', '/api/rag/status',
  ];
  for (const p of protectedGets) {
    const r = await request('GET', p);
    ok(`Unauth ${p} 401`, r.status === 401);
  }

  // ============ LOGIN ============
  console.log('\n--- Login ---');
  ok('Login success', await login(jar));

  // ============ AUTH GETS ============
  console.log('\n--- Auth GETs ---');
  const C = jar.header();
  const H = { cookies: C };
  const authGets = [
    { path: '/api/auth/me', want: (b) => b && typeof b.rotation_threshold_days === 'number' },
    { path: '/api/events' },
    { path: '/api/airlines' },
    { path: '/api/hotels' },
    { path: '/api/flights' },
    { path: '/api/tickets' },
    { path: '/api/packages' },
    { path: '/api/orders' },
    { path: '/api/waiting-list' },
    { path: '/api/coupons' },
    { path: '/api/faq' },
    { path: '/api/audit' },
    { path: '/api/issues' },
    { path: '/api/company-info' },
    { path: '/api/admin/backups' },
    { path: '/api/whatsapp/log' },
    { path: '/api/whatsapp/templates' },
    { path: '/api/whatsapp/sessions' },
    { path: '/api/whatsapp/health' },
    { path: '/api/email/templates' },
    { path: '/api/email/server-status' },
    { path: '/api/admin/email-log' },
    { path: '/api/admin/sms-log' },
    { path: '/api/admin/unsubscribes' },
    { path: '/api/admin/unsubscribes/history' },
    { path: '/api/admin/marketing/contacts' },
    { path: '/api/rag/status', want: (b) => b && typeof b.total === 'number' },
    { path: '/api/settings' },
    { path: '/api/auth/users' },
  ];
  for (const g of authGets) {
    const r = await request('GET', g.path, H);
    const cond = r.status === 200 && (!g.want || g.want(r.body));
    ok(`GET ${g.path}`, cond, !cond ? `status=${r.status} body=${JSON.stringify(r.body).slice(0, 150)}` : '');
  }

  // ============ CROSS-RESOURCE: grab IDs from events/orders and test detail endpoints ============
  console.log('\n--- Detail endpoints (dynamic IDs) ---');
  const eventsR = await request('GET', '/api/events', H);
  const firstEventId = Array.isArray(eventsR.body) ? eventsR.body[0]?.id : null;
  if (firstEventId) {
    const r = await request('GET', `/api/events/${firstEventId}`, H);
    ok(`GET /api/events/${firstEventId.slice(0, 8)}...`, r.status === 200 && r.body?.id === firstEventId);
  }
  const ordersR = await request('GET', '/api/orders', H);
  const ordersList = Array.isArray(ordersR.body) ? ordersR.body : (ordersR.body?.orders || []);
  const firstOrderId = ordersList[0]?.id;
  const firstOrderShareToken = ordersList[0]?.share_token;
  if (firstOrderId) {
    const r = await request('GET', `/api/orders/${firstOrderId}`, H);
    ok(`GET /api/orders/${firstOrderId.slice(0, 8)}... returns order + participants`, r.status === 200 && r.body?.order?.participants);
    if (r.body?.order?.participants?.length) {
      const p = r.body.order.participants[0];
      // Passport decryption E2E: passport_number should be plaintext digits, not base64 ciphertext
      const isDecrypted = !p.passport_number || /^[0-9A-Z\-\s]+$/i.test(p.passport_number);
      ok(`Passport decrypted on read (not base64 blob)`, isDecrypted, `got: ${(p.passport_number || '').slice(0, 40)}`);
    }
  }
  if (firstOrderShareToken) {
    const r = await request('GET', `/api/orders/token/${firstOrderShareToken}`);
    ok(`GET /api/orders/token/<valid>`, r.status === 200 && r.body?.id === firstOrderId);
  }
  const hotelsR = await request('GET', '/api/hotels', H);
  const firstHotel = Array.isArray(hotelsR.body) ? hotelsR.body[0] : null;
  if (firstHotel?.id) {
    const r = await request('GET', `/api/hotels/${firstHotel.id}`, H);
    ok(`GET /api/hotels/<id>`, r.status === 200 && r.body?.id === firstHotel.id);
    const rr = await request('GET', `/api/hotels/${firstHotel.id}/rooms`, H);
    ok(`GET /api/hotels/<id>/rooms`, rr.status === 200);
  }
  const airlinesR = await request('GET', '/api/airlines', H);
  const firstAirline = Array.isArray(airlinesR.body) ? airlinesR.body[0] : null;
  if (firstAirline?.id) {
    const r = await request('GET', `/api/airlines/${firstAirline.id}`, H);
    ok(`GET /api/airlines/<id>`, r.status === 200);
    const rr = await request('GET', `/api/airlines/${firstAirline.id}/flights`, H);
    ok(`GET /api/airlines/<id>/flights`, rr.status === 200);
  }
  // Legal slug
  { const r = await request('GET', '/api/legal/terms'); ok('GET /api/legal/terms (public)', r.status === 200 || r.status === 404); }
  { const r = await request('GET', '/api/legal/privacy'); ok('GET /api/legal/privacy (public)', r.status === 200 || r.status === 404); }

  // ============ RAG ============
  console.log('\n--- RAG ---');
  {
    const r = await request('POST', '/api/rag/ask', { ...H, body: { question: 'כמה טיסות יש לברצלונה?' } });
    ok('POST /api/rag/ask returns answer with pass/fail/give_up grade', r.status === 200 && ['pass', 'fail', 'give_up'].includes(r.body?.grade), r.status !== 200 ? `status=${r.status}` : '');
  }
  {
    const r = await request('POST', '/api/rag/ask', { ...H, body: { question: '' } });
    ok('POST /api/rag/ask empty -> 400', r.status === 400);
  }

  // ============ CSRF ============
  console.log('\n--- CSRF ---');
  {
    const r = await fetch(`${BASE}/api/events`, {
      method: 'POST',
      headers: { Cookie: C, Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
      body: '{}',
      redirect: 'manual',
    });
    ok('Cross-origin admin POST 403', r.status === 403);
  }

  // ============ AUDIT LOG: was our login recorded? ============
  console.log('\n--- Audit trail ---');
  {
    const r = await request('GET', '/api/audit?entity_type=user', H);
    const list = r.body?.entries || [];
    const hasLogin = list.some((e) => e.action === 'login_success');
    ok('audit_log contains login_success', r.status === 200 && hasLogin);
  }

  // ============ SUMMARY ============
  console.log(`\n${'='.repeat(50)}`);
  console.log(`PASS: ${pass.length}   FAIL: ${fail.length}`);
  if (fail.length > 0) {
    console.log('\nFailures:');
    for (const f of fail) console.log(`  ✗ ${f.name}${f.detail ? ' — ' + f.detail : ''}`);
  }
  process.exit(fail.length === 0 ? 0 : 1);
}

run().catch((e) => { console.error('FATAL:', e); process.exit(2); });
