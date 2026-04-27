/* eslint-disable */
const { Client } = require("pg");
const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const BASE = process.env.NEXTAUTH_URL?.includes("localhost")
  ? "https://eng-tours.vercel.app"
  : "https://eng-tours.vercel.app";

let pass = 0, fail = 0;
function ok(msg) { console.log("\x1b[32m✓\x1b[0m", msg); pass++; }
function bad(msg, err) { console.log("\x1b[31m✗\x1b[0m", msg, err ? `— ${err}` : ""); fail++; }

async function main() {
  const c = new Client({
    host: "db.ijeauuonjtskughxtmic.supabase.co",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  console.log("\n=== DB schema ===");
  const cols = await c.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='marketing_pages' ORDER BY ordinal_position
  `);
  const colNames = cols.rows.map((r) => r.column_name);
  const required = ["id", "slug", "title", "html", "is_active", "main_artist", "guest_artist",
    "event_date", "city", "country", "venue_name", "ticket_purchase_link", "intro_text",
    "cover_image_url", "wa_message_template", "notification_phone", "archived_at"];
  for (const f of required) {
    if (colNames.includes(f)) ok(`marketing_pages.${f} exists`);
    else bad(`marketing_pages.${f} MISSING`);
  }

  const lcols = await c.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name='marketing_leads' ORDER BY ordinal_position
  `);
  const lNames = lcols.rows.map((r) => r.column_name);
  const lReq = ["id", "page_id", "first_name", "last_name", "phone", "email", "interest_type",
    "whatsapp_status", "whatsapp_sent_at", "email_status", "email_sent_at", "affiliate_id",
    "archived_at", "handled", "handled_at"];
  for (const f of lReq) {
    if (lNames.includes(f)) ok(`marketing_leads.${f} exists`);
    else bad(`marketing_leads.${f} MISSING`);
  }

  const acols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='marketing_affiliates' ORDER BY ordinal_position`);
  const aNames = acols.rows.map((r) => r.column_name);
  for (const f of ["id", "page_id", "name", "tracking_code", "clicks"]) {
    if (aNames.includes(f)) ok(`marketing_affiliates.${f} exists`);
    else bad(`marketing_affiliates.${f} MISSING`);
  }

  console.log("\n=== Data integrity ===");
  const { rows: [pg] } = await c.query(`SELECT * FROM marketing_pages WHERE slug='neworld-athens'`);
  if (pg) {
    ok(`Demo page neworld-athens exists`);
    if (pg.notification_phone) ok(`notification_phone set: ${pg.notification_phone}`);
    else bad(`notification_phone NOT set on demo page`);
    if (pg.title === "NEWORLD") ok(`title=NEWORLD`); else bad(`title is "${pg.title}"`);
    if (pg.cover_image_url) ok(`cover_image_url set`);
    else console.log("  (no cover yet — informational)");
  } else {
    bad(`Demo page neworld-athens NOT FOUND`);
  }

  const { rows: leads } = await c.query(`SELECT count(*) FROM marketing_leads WHERE page_id=$1`, [pg?.id]);
  ok(`Leads count for demo page: ${leads[0].count}`);

  const { rows: orphan } = await c.query(`SELECT count(*) FROM marketing_leads WHERE page_id IS NULL`);
  if (orphan[0].count === "0") ok(`No orphan leads (page_id IS NULL): 0`);
  else bad(`Orphan leads (no page_id): ${orphan[0].count}`);

  const { rows: badAff } = await c.query(`
    SELECT count(*) FROM marketing_leads l
    LEFT JOIN marketing_affiliates a ON l.affiliate_id = a.id
    WHERE l.affiliate_id IS NOT NULL AND a.id IS NULL
  `);
  if (badAff[0].count === "0") ok(`No leads pointing to deleted affiliates`);
  else bad(`${badAff[0].count} leads point to deleted affiliates`);

  console.log("\n=== Public endpoints (no auth) ===");
  const r1 = await fetch(`${BASE}/m/neworld-athens`);
  if (r1.ok) ok(`/m/neworld-athens returns 200`); else bad(`/m/neworld-athens status ${r1.status}`);
  const html = await r1.text();
  if (html.includes("NEWORLD")) ok(`Page renders NEWORLD title`); else bad(`NEWORLD not in HTML`);
  if (html.includes("ARGY")) ok(`Page renders main_artist (ARGY)`); else bad(`ARGY not in HTML`);
  if (html.includes("ARTBAT")) ok(`Page renders guest_artist (ARTBAT)`); else bad(`ARTBAT not in HTML`);
  if (html.includes("Athens")) ok(`Page renders city`); else bad(`Athens not in HTML`);
  if (pg?.cover_image_url && html.includes(pg.cover_image_url)) ok(`Cover image rendered in HTML`);
  else if (!pg?.cover_image_url) console.log("  (no cover URL to check)");
  else bad(`Cover URL not in HTML`);

  const r2 = await fetch(`${BASE}/m/does-not-exist-xyz`);
  if (r2.status === 404) ok(`Non-existent slug returns 404`);
  else bad(`Non-existent slug status ${r2.status} (expected 404)`);

  console.log("\n=== Public lead intake ===");
  const csrfResp = await fetch(`${BASE}/api/marketing/lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (csrfResp.status === 400) ok(`Empty body -> 400`);
  else bad(`Empty body status ${csrfResp.status}`);

  const invalidEmailResp = await fetch(`${BASE}/api/marketing/lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: "neworld-athens",
      first_name: "Test", last_name: "User",
      phone: "0501234567", email: "not-email", interest_type: "package_inquiry",
    }),
  });
  if (invalidEmailResp.status === 400) ok(`Invalid email -> 400`);
  else bad(`Invalid email status ${invalidEmailResp.status}`);

  const invalidInterest = await fetch(`${BASE}/api/marketing/lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: "neworld-athens",
      first_name: "Test", last_name: "User",
      phone: "0501234567", email: "test@example.com", interest_type: "bogus",
    }),
  });
  if (invalidInterest.status === 400) ok(`Invalid interest_type -> 400`);
  else bad(`Invalid interest_type status ${invalidInterest.status}`);

  const noSlug = await fetch(`${BASE}/api/marketing/lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: "T", last_name: "U", phone: "0501234567",
      email: "t@example.com", interest_type: "package_inquiry",
    }),
  });
  if (noSlug.status === 400) ok(`Missing slug -> 400`);
  else bad(`Missing slug status ${noSlug.status}`);

  console.log("\n=== Click tracking ===");
  const r3 = await fetch(`${BASE}/api/marketing/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "ug3udcm" }),
  });
  if (r3.ok) ok(`track endpoint accepts known code`);
  else bad(`track endpoint status ${r3.status}`);

  const r4 = await fetch(`${BASE}/api/marketing/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "fakecode-xyz" }),
  });
  if (r4.status === 404) ok(`Unknown tracking code -> 404`);
  else bad(`Unknown code status ${r4.status}`);

  console.log("\n=== Admin endpoints (should be 401 without auth) ===");
  const adminEndpoints = [
    "/api/admin/marketing/pages",
    `/api/admin/marketing/pages/${pg?.id}`,
    `/api/admin/marketing/pages/${pg?.id}/leads`,
    `/api/admin/marketing/pages/${pg?.id}/affiliates`,
  ];
  for (const ep of adminEndpoints) {
    const r = await fetch(`${BASE}${ep}`);
    if (r.status === 401) ok(`${ep} -> 401 unauth`);
    else bad(`${ep} status ${r.status} (expected 401)`);
  }

  console.log("\n=== Outbound queue & cron ===");
  const { rows: queueCount } = await c.query(`SELECT count(*) FROM outbound_queue WHERE status='pending'`);
  ok(`Pending queue items: ${queueCount[0].count}`);
  const { rows: failedCount } = await c.query(`SELECT count(*) FROM outbound_queue WHERE status='failed'`);
  if (failedCount[0].count === "0") ok(`No failed queue items`);
  else console.log(`  (${failedCount[0].count} failed items in queue — informational)`);

  console.log("\n=== Storage bucket ===");
  // Just check that we have one cover URL working
  if (pg?.cover_image_url) {
    const r = await fetch(pg.cover_image_url, { method: "HEAD" });
    if (r.ok) ok(`Cover image URL returns ${r.status}`);
    else bad(`Cover image URL returned ${r.status}`);
  }

  await c.end();

  console.log("\n" + "=".repeat(50));
  console.log(`PASS: ${pass}   FAIL: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
