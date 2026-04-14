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

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"source" | "rendered">("rendered");

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <Link href="/settings-hub" className="text-sm text-primary-700 hover:underline">← חזרה להגדרות</Link>
          <h2 className="text-2xl font-bold text-primary-900 mt-1">📧 תבניות מייל</h2>
          <p className="text-sm text-gray-500 mt-1">עריכת כל ההודעות שנשלחות ללקוחות וספקים במייל</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetAll} className="text-sm border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50">
            🔄 אפס הכל לברירת מחדל
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : (
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
                      <span className={`text-xs font-medium ${isActive ? "text-green-700" : "text-gray-400"}`}>
                        {isActive ? "פעיל" : "כבוי"}
                      </span>
                      <button type="button" onClick={() => toggleActive(t)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-gray-300"}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-1" : "translate-x-6"}`} />
                      </button>
                    </label>
                    {!isEditing && (
                      <button onClick={() => { setEditing(t.id); setEditSubject(t.subject); setEditBody(t.body_html); }}
                        className="text-xs bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1.5 rounded hover:bg-primary-100">
                        ✏️ ערוך
                      </button>
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
                          className={`text-xs px-2 py-0.5 rounded ${previewMode === "rendered" ? "bg-primary-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                          רינדור
                        </button>
                        <button onClick={() => setPreviewMode("source")}
                          className={`text-xs px-2 py-0.5 rounded ${previewMode === "source" ? "bg-primary-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                          מקור
                        </button>
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
                      className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                      ביטול
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
