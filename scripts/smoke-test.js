// Smoke test for critical security + flow endpoints.
// Run: node scripts/smoke-test.js [base-url]
// Default base: https://eng-tours.vercel.app
const BASE = process.argv[2] || 'https://eng-tours.vercel.app';
const EMAIL = 'oren@bin.co.il';
const PASSWORD = 'oren12345';

let passed = 0, failed = 0;
const results = [];

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else      { failed++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
  results.push({ name, ok: !!cond, detail });
}

function cookieJar() {
  const jar = {};
  return {
    set(setCookie) {
      if (!setCookie) return;
      const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
      for (const c of arr) {
        const [kv] = c.split(';');
        const [k, v] = kv.split('=');
        if (k && v) jar[k.trim()] = v.trim();
      }
    },
    header() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); },
    has(k) { return !!jar[k]; },
  };
}

async function run() {
  console.log(`\nSmoke-testing ${BASE}\n`);

  // 1. Security headers
  {
    const r = await fetch(`${BASE}/login`);
    check('GET /login 200', r.status === 200);
    check('CSP header', !!r.headers.get('content-security-policy'));
    check('HSTS header', !!r.headers.get('strict-transport-security'));
    check('X-Frame-Options', r.headers.get('x-frame-options') === 'SAMEORIGIN');
  }

  // 2. Login flow
  const jar = cookieJar();
  let csrf;
  {
    const r = await fetch(`${BASE}/api/auth/csrf`);
    jar.set(r.headers.getSetCookie?.() || r.headers.get('set-cookie'));
    const j = await r.json();
    csrf = j.csrfToken;
    check('CSRF token returned', !!csrf);
  }
  {
    const form = new URLSearchParams({ csrfToken: csrf, email: EMAIL, password: PASSWORD, json: 'true' });
    const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: jar.header() },
      body: form.toString(),
      redirect: 'manual',
    });
    jar.set(r.headers.getSetCookie?.() || r.headers.get('set-cookie'));
    check('Login 200', r.status === 200);
    check('Session cookie set', jar.has('__Secure-next-auth.session-token') || jar.has('next-auth.session-token'));
  }

  // 3. Protected endpoint requires auth
  {
    const r = await fetch(`${BASE}/api/events`, { redirect: 'manual' });
    check('Unauth GET /api/events 401', r.status === 401);
  }
  {
    const r = await fetch(`${BASE}/api/events`, { headers: { Cookie: jar.header() }, redirect: 'manual' });
    check('Auth GET /api/events 200', r.status === 200);
  }

  // 4. Webhook returns 401 without signature
  {
    const r = await fetch(`${BASE}/api/whatsapp/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    check('WA webhook without signature 401', r.status === 401);
  }
  {
    const r = await fetch(`${BASE}/api/pulseem/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    check('Pulseem webhook without token 401', r.status === 401 || r.status === 503);
  }

  // 5. Unsubscribe rejects invalid token (not rate limit exhaust — just validation)
  {
    const r = await fetch(`${BASE}/api/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x@y.com', token: 'bad' }),
    });
    check('Unsubscribe invalid token 403', r.status === 403);
  }

  // 6. Rate limit — NOTE: in-memory across Vercel instances is flaky.
  // Skipped in smoke, kept as local-only check.
  // 7. security.txt
  {
    const r = await fetch(`${BASE}/.well-known/security.txt`);
    const text = await r.text();
    check('security.txt reachable', r.status === 200 && text.includes('Contact:'));
  }

  // 7. Public order by token — 404 on bogus token (not 500)
  {
    const r = await fetch(`${BASE}/api/orders/token/bogus-token-xyz`);
    check('Bogus order token 404', r.status === 404);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((e) => { console.error('FATAL:', e); process.exit(2); });
