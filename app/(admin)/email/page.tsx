"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  variables: string[];
  is_active?: boolean;
}

const TEMPLATE_META: Record<string, { title: string; usage: string; exampleVars: Record<string, string> }> = {
  order_created: { title: "אישור הזמנה חדשה", usage: "נשלח אוטומטית ללקוח עם יצירת הזמנה", exampleVars: { event_name: "פסטיבל איי יוון", order_id: "A1B2C3D4", link: "https://eng-tours.vercel.app/p/abc-123" } },
  order_details: { title: "פרטי הזמנה (ידני)", usage: "כשאדמין לוחץ 'שלח במייל' בעמוד הזמנה", exampleVars: { event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" } },
  order_details_buyers: { title: "שליחה לכל הרוכשים", usage: "אדמין → 'שלח לרוכשים'", exampleVars: { first_name: "דן", event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" } },
  payment_confirmed: { title: "אישור תשלום", usage: "נשלח ללקוח כשההזמנה משולמת במלואה", exampleVars: { event_name: "פסטיבל איי יוון", amount: "5000", order_id: "A1B2C3D4" } },
  partial_payment: { title: "תשלום חלקי", usage: "נשלח כשיש יתרה לשלם", exampleVars: { event_name: "פסטיבל איי יוון", paid: "2000", remaining: "3000", order_id: "A1B2C3D4", link: "https://..." } },
  order_confirmed_customer: { title: "אישור סופי ללקוח", usage: "status=confirmed → נשלח ללקוח", exampleVars: { event_name: "פסטיבל איי יוון", link: "https://..." } },
  event_reminder: { title: "תזכורת לפני אירוע", usage: "נשלח אוטומטית N ימים לפני האירוע", exampleVars: { n: "7", event_name: "פסטיבל איי יוון", link: "https://..." } },
  supplier_new_order: { title: "הזמנה חדשה לספק", usage: "נשלח לספק בסטטוס supplier_review", exampleVars: { order_id: "A1B2C3D4", event_name: "פסטיבל איי יוון", link: "https://..." } },
  "2fa_code": { title: "קוד אימות 2FA", usage: "נשלח בעת התחברות עם 2FA מופעל", exampleVars: { code: "123456" } },
};

function applyTemplate(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

type Tab = "templates" | "server" | "test" | "unsubscribes";

export default function EmailHubPage() {
  const [tab, setTab] = useState<Tab>("templates");

  return (
    <div>
      <div className="mb-6">
        <Link href="/settings-hub" className="text-sm text-primary-700 hover:underline">← חזרה להגדרות</Link>
        <h2 className="text-2xl font-bold text-primary-900 mt-1">📧 מיילים</h2>
        <p className="text-sm text-gray-500 mt-1">תבניות, הגדרות שרת דואר ובדיקת שליחה</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { id: "templates" as const, label: "תבניות", icon: "📝" },
          { id: "server" as const, label: "שרת דואר", icon: "🖥️" },
          { id: "test" as const, label: "מייל בדיקה", icon: "🧪" },
          { id: "unsubscribes" as const, label: "מיילים מוסרים", icon: "🚫" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-primary-700 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "templates" && <TemplatesTab />}
      {tab === "server" && <ServerTab />}
      {tab === "test" && <TestTab />}
      {tab === "unsubscribes" && <UnsubscribesTab />}
    </div>
  );
}

function UnsubscribesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/unsubscribes", { cache: "no-store" });
      const d = await res.json();
      setItems(d.items || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function remove(email: string) {
    if (!confirm(`להחזיר את ${email} לרשימת התפוצה?`)) return;
    const res = await fetch("/api/admin/unsubscribes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) load();
  }

  const reasonLabels: Record<string, string> = {
    too_many_emails: "יותר מדי מיילים",
    not_relevant: "תוכן לא רלוונטי",
    never_signed_up: "לא נרשם",
    other: "אחר",
  };

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <div className="text-4xl mb-2">📬</div>
        <p className="text-gray-500">אף אחד עדיין לא הסיר את עצמו</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{items.length} מוסרים</h3>
        <button onClick={load} className="text-xs bg-primary-50 text-primary-700 px-3 py-1 rounded hover:bg-primary-100">🔄 רענן</button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-right px-4 py-2 font-medium text-gray-600">מייל</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">סיבה</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">מקור</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">תאריך הסרה</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">פעולות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((it) => (
            <tr key={it.email}>
              <td className="px-4 py-2 font-mono text-xs" dir="ltr">{it.email}</td>
              <td className="px-4 py-2 text-xs text-gray-600">{reasonLabels[it.reason] || it.reason || "—"}</td>
              <td className="px-4 py-2 text-xs text-gray-500">{it.source}</td>
              <td className="px-4 py-2 text-xs text-gray-500">{new Date(it.unsubscribed_at).toLocaleString("he-IL")}</td>
              <td className="px-4 py-2">
                <button onClick={() => remove(it.email)} className="text-xs text-red-600 hover:text-red-800 underline">
                  החזר לרשימה
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"source" | "rendered">("rendered");
  const [fullPreview, setFullPreview] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/email/templates", { cache: "no-store" });
      const data = await res.json();
      setTemplates(data.templates || []);
    } finally { setLoading(false); }
  }

  async function save(t: Template) {
    setSaving(true);
    try {
      const res = await fetch("/api/email/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, subject: editSubject, body_html: editBody }),
      });
      if (res.ok) { setEditing(null); load(); }
      else { const d = await res.json(); alert(d.error || "שגיאה"); }
    } finally { setSaving(false); }
  }

  async function toggleActive(t: Template) {
    const next = t.is_active === false;
    setTemplates((p) => p.map((x) => x.id === t.id ? { ...x, is_active: next } : x));
    const res = await fetch("/api/email/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, is_active: next }),
    });
    if (!res.ok) { setTemplates((p) => p.map((x) => x.id === t.id ? { ...x, is_active: !next } : x)); alert("שגיאה"); }
  }

  async function resetAll() {
    if (!confirm("לאפס את כל תבניות המייל לברירת מחדל? כל השינויים יאבדו.")) return;
    const res = await fetch("/api/email/templates/reset-all", { method: "POST" });
    const d = await res.json();
    alert(res.ok ? `${d.restored} תבניות שוחזרו` : "שגיאה");
    load();
  }

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={resetAll} className="text-sm border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50">
          🔄 אפס הכל לברירת מחדל
        </button>
      </div>

      <div className="space-y-3">
        {templates.map((t) => {
          const meta = TEMPLATE_META[t.name];
          const isActive = t.is_active !== false;
          const isEditing = editing === t.id;
          const subject = applyTemplate(isEditing ? editSubject : t.subject, meta?.exampleVars || {});
          const body = applyTemplate(isEditing ? editBody : t.body_html, meta?.exampleVars || {});

          return (
            <div key={t.id} className={`rounded-xl shadow-sm p-5 border transition-all ${isActive ? "bg-white border-gray-100" : "bg-gray-50 border-gray-200 opacity-70"}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{meta?.title || t.name}</h3>
                    <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded" dir="ltr">{t.name}</code>
                    {!isActive && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">⛔ כבוי</span>}
                  </div>
                  {meta?.usage && <p className="text-xs text-gray-500 mt-1">💡 {meta.usage}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer" title={isActive ? "לחץ לכיבוי" : "לחץ להפעלה"}>
                    <span className={`text-xs font-medium ${isActive ? "text-green-700" : "text-gray-400"}`}>{isActive ? "פעיל" : "כבוי"}</span>
                    <button type="button" onClick={() => toggleActive(t)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-gray-300"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-1" : "translate-x-6"}`} />
                    </button>
                  </label>
                  {!isEditing && (
                    <>
                      <button onClick={() => setFullPreview(t.name)}
                        className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-100">
                        👁️ תצוגה מקדימה
                      </button>
                      <button onClick={() => { setEditing(t.id); setEditSubject(t.subject); setEditBody(t.body_html); }}
                        className="text-xs bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1.5 rounded hover:bg-primary-100">
                        ✏️ ערוך
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">נושא (Subject):</label>
                  {isEditing ? (
                    <input type="text" value={editSubject} onChange={(e) => setEditSubject(e.target.value)}
                      className="w-full border border-primary-300 rounded-lg p-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  ) : (
                    <div className="bg-gray-50 rounded p-2 mt-1 text-sm border border-gray-200">{t.subject}</div>
                  )}

                  <label className="text-xs font-medium text-gray-600 mt-3 block">גוף HTML:</label>
                  {isEditing ? (
                    <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={10}
                      className="w-full border border-primary-300 rounded-lg p-3 text-xs font-mono mt-1 focus:outline-none focus:ring-2 focus:ring-primary-500" dir="ltr" />
                  ) : (
                    <pre className="bg-gray-50 rounded p-2 mt-1 text-xs whitespace-pre-wrap border border-gray-200 max-h-56 overflow-y-auto" dir="ltr">{t.body_html}</pre>
                  )}
                  {t.variables?.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      <span className="text-xs text-gray-500">משתנים:</span>
                      {t.variables.map((v) => (
                        <code key={v} className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded" dir="ltr">{`{{${v}}}`}</code>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-600">תצוגה מקדימה:</label>
                    <div className="flex gap-1">
                      <button onClick={() => setPreviewMode("rendered")}
                        className={`text-xs px-2 py-0.5 rounded ${previewMode === "rendered" ? "bg-primary-700 text-white" : "bg-gray-100 text-gray-600"}`}>רינדור</button>
                      <button onClick={() => setPreviewMode("source")}
                        className={`text-xs px-2 py-0.5 rounded ${previewMode === "source" ? "bg-primary-700 text-white" : "bg-gray-100 text-gray-600"}`}>מקור</button>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs font-semibold text-yellow-800 mb-1">נושא: {subject}</div>
                  {previewMode === "rendered" ? (
                    <div className="border border-gray-200 rounded-lg p-3 max-h-72 overflow-y-auto bg-white" dangerouslySetInnerHTML={{ __html: body }} />
                  ) : (
                    <pre className="border border-gray-200 rounded-lg p-3 max-h-72 overflow-y-auto bg-gray-50 text-xs" dir="ltr">{body}</pre>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => save(t)} disabled={saving}
                    className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50">
                    {saving ? "שומר..." : "💾 שמור"}
                  </button>
                  <button onClick={() => setEditing(null)}
                    className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">ביטול</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {fullPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setFullPreview(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-sm font-bold text-gray-800">📧 תצוגה מקדימה מלאה</h3>
                <p className="text-xs text-gray-500">תבנית: <code dir="ltr">{fullPreview}</code> · כולל header, footer, קישור הסרה</p>
              </div>
              <div className="flex gap-2">
                <a href={`/api/email/templates/preview?name=${fullPreview}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs bg-primary-700 text-white px-3 py-1.5 rounded hover:bg-primary-800">🔗 פתח בטאב חדש</a>
                <button onClick={() => setFullPreview(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2">×</button>
              </div>
            </div>
            <iframe
              src={`/api/email/templates/preview?name=${fullPreview}`}
              className="flex-1 w-full bg-gray-100 border-0"
              style={{ minHeight: "600px" }}
              title={`preview-${fullPreview}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ServerTab() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/email/server-status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">בודק מצב...</div>;

  const badge = (ok: boolean, label: string) => (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );

  const domainOk = status?.domainStatus === "verified";

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">🖥️ ספק שירות</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-gray-500">ספק:</div>
          <div className="font-medium text-gray-800">{status?.provider}</div>

          <div className="text-gray-500">API Key:</div>
          <div>{badge(!!status?.apiKeyConfigured, status?.apiKeyConfigured ? "מוגדר" : "חסר")}</div>

          <div className="text-gray-500">כתובת שולח (FROM):</div>
          <div className="font-mono text-gray-800" dir="ltr">{status?.fromName} &lt;{status?.fromEmail}&gt;</div>

          <div className="text-gray-500">סטטוס דומיין:</div>
          <div>
            {status?.domainStatus === "verified" && badge(true, "מאומת")}
            {status?.domainStatus === "not_verified" && badge(false, "לא מאומת")}
            {status?.domainStatus === "error" && <span className="text-xs text-red-700">שגיאה: {status.domainMessage}</span>}
            {status?.domainStatus === "unknown" && <span className="text-xs text-gray-400">לא זמין</span>}
          </div>
        </div>
      </div>

      {!status?.apiKeyConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
          <div className="font-semibold text-yellow-900 mb-1">⚠️ RESEND_API_KEY חסר</div>
          <p className="text-yellow-800">הוסף את המשתנה ב-Vercel: Settings → Environment Variables → <code dir="ltr">RESEND_API_KEY</code>, ואז Redeploy.</p>
        </div>
      )}

      {status?.apiKeyConfigured && !domainOk && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm">
          <div className="font-semibold text-orange-900 mb-1">⚠️ דומיין לא מאומת</div>
          <p className="text-orange-800 mb-2">{status?.domainMessage}</p>
          <p className="text-orange-800">
            עד שהדומיין יאומת ב-Resend, ניתן לשלוח רק לכתובת הבעלים (Sandbox).
            <br />
            כדי לשלוח לכולם — הוסף את <code dir="ltr">{status?.fromEmail?.split("@")[1]}</code> ב-
            <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="underline mx-1">Resend Domains</a>
            והגדר DNS (SPF + DKIM).
          </p>
        </div>
      )}

      {status?.apiKeyConfigured && domainOk && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-900">
          ✅ השרת פעיל ומוכן לשליחה לכל כתובת.
        </div>
      )}
    </div>
  );
}

function TestTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/email/templates", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const list = (d.templates || []).filter((t: Template) => t.is_active !== false);
        setTemplates(list);
        if (list[0]) setSelected(list[0].name);
      });
  }, []);

  async function send() {
    if (!to || !selected) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/email/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, template: selected }),
      });
      const d = await res.json();
      if (res.ok) setResult({ ok: true, msg: `נשלח בהצלחה (id: ${d.id})` });
      else setResult({ ok: false, msg: d.error || "שליחה נכשלה" });
    } catch (e: any) {
      setResult({ ok: false, msg: e.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">בחר תבנית</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            {templates.map((t) => (
              <option key={t.id} value={t.name}>
                {TEMPLATE_META[t.name]?.title || t.name} — {t.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">התבנית תישלח עם נתוני דוגמה (אותם שמוצגים בתצוגה המקדימה).</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">נמען</label>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com" dir="ltr"
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <p className="text-xs text-gray-500 mt-1">אם הדומיין אינו מאומת ב-Resend — ניתן לשלוח רק לבעל חשבון Resend.</p>
        </div>

        <button onClick={send} disabled={sending || !to || !selected}
          className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50">
          {sending ? "שולח..." : "🧪 שלח בדיקה"}
        </button>

        {result && (
          <div className={`rounded-lg p-3 text-sm ${result.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {result.ok ? "✓" : "✗"} {result.msg}
          </div>
        )}
      </div>
    </div>
  );
}
