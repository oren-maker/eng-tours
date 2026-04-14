// Sends 3 real-world emails using the production renderEmailTemplate (with company info + unsubscribe footer)
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2].trim(); }
const { Client } = require('pg');
const crypto = require('crypto');

const KEY = "re_GNSKiKma_7T7N72LbCeHeb2ha8RwDgxqb";
const TO = "oren@bin.co.il";
const FROM = "ENG TOURS <onboarding@resend.dev>";
const BASE = "https://eng-tours.vercel.app";

function signEmailToken(email) {
  const key = process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "default-unsubscribe-key";
  return crypto.createHmac("sha256", key).update(email.toLowerCase().trim()).digest("hex").slice(0, 16);
}

function applyTemplate(text, vars) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] == null ? "" : String(vars[k]));
}

async function getCompanyInfo(c) {
  const { rows } = await c.query("SELECT key, value FROM system_settings WHERE key IN ('company_name','company_tagline','company_phone','company_email','company_website','company_address')");
  const info = {};
  for (const r of rows) info[r.key] = r.value || "";
  return info;
}

function wrapHtml(info, subject, body, recipient) {
  const name = info.company_name || "ENG TOURS";
  const tagline = info.company_tagline || "";
  const year = new Date().getFullYear();
  const footerParts = [];
  if (info.company_phone) footerParts.push(`📞 ${info.company_phone}`);
  if (info.company_email) footerParts.push(`📧 <a href="mailto:${info.company_email}" style="color:#fbbf24;text-decoration:none">${info.company_email}</a>`);
  if (info.company_website) footerParts.push(`🌐 <a href="${info.company_website}" style="color:#fbbf24;text-decoration:none">${info.company_website.replace(/^https?:\/\//, "")}</a>`);
  const unsubUrl = `${BASE}/unsubscribe?email=${encodeURIComponent(recipient)}&token=${signEmailToken(recipient)}`;

  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#fff8ed;font-family:-apple-system,BlinkMacSystemFont,'Heebo',Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid #f3e8ff">
      <div style="background:linear-gradient(135deg,#DD9933 0%,#b87a1f 100%);padding:24px;text-align:center">
        <h1 style="margin:0;color:white;font-size:28px;letter-spacing:1px">${name}</h1>
        ${tagline ? `<p style="margin:6px 0 0;color:white;opacity:0.92;font-size:13px">${tagline}</p>` : ""}
      </div>
      <div style="padding:24px;color:#374151;line-height:1.6">
        <style>.btn{display:inline-block;background:#DD9933;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:500;margin:8px 0}.btn:hover{background:#b87a1f}h2{color:#1f2937;margin-top:0}</style>
        ${body}
      </div>
      <div style="background:#1f2937;padding:20px;text-align:center;color:#9ca3af;font-size:12px;line-height:1.8">
        ${footerParts.join(" · ")}
        ${info.company_address ? `<div style="margin-top:4px">${info.company_address}</div>` : ""}
        <div style="margin-top:8px">© ${year} ${name} · כל הזכויות שמורות</div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #374151;font-size:11px"><a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline">הסר אותי מרשימת התפוצה</a></div>
      </div>
    </div>
  </div>
</body></html>`;
}

async function send(name, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ from: FROM, to: [TO], subject, html }),
  });
  const d = await res.json();
  console.log(name, "→", res.status, d.id || d.message);
}

(async () => {
  const c = new Client({ host: 'db.ijeauuonjtskughxtmic.supabase.co', port: 5432, database: 'postgres', user: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const info = await getCompanyInfo(c);
  const { rows: templates } = await c.query("SELECT name, subject, body_html FROM email_templates WHERE name IN ('order_created', 'payment_confirmed', 'event_reminder')");
  await c.end();

  const samples = {
    order_created: { event_name: "פסטיבל איי יוון", order_id: "A1B2C3D4", link: `${BASE}/p/abc-123` },
    payment_confirmed: { event_name: "פסטיבל איי יוון", amount: "10,863", order_id: "A1B2C3D4" },
    event_reminder: { n: "7", event_name: "פסטיבל איי יוון", link: `${BASE}/p/abc-123` },
  };

  for (const t of templates) {
    const subject = applyTemplate(t.subject, samples[t.name] || {});
    const body = applyTemplate(t.body_html, samples[t.name] || {});
    const html = wrapHtml(info, subject, body, TO);
    await send(t.name, subject, html);
    await new Promise(r => setTimeout(r, 1500));
  }
})();
