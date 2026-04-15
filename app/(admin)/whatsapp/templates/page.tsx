"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  body: string;
  variables: string[];
  is_active?: boolean;
  description?: string | null;
  channels?: string[];
}

type Channel = "whatsapp" | "sms" | "email";
const CHANNEL_META: Record<Channel, { label: string; icon: string; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: "💬", color: "green" },
  sms: { label: "SMS", icon: "📱", color: "blue" },
  email: { label: "Email", icon: "📧", color: "purple" },
};

const TEMPLATE_DESCRIPTIONS: Record<string, { title: string; usage: string; exampleVars: Record<string, string> }> = {
  order_created: { title: "אישור הזמנה חדשה", usage: "נשלח אוטומטית ללקוח עם יצירת הזמנה חדשה", exampleVars: { event_name: "פסטיבל איי יוון", order_id: "A1B2C3D4", link: "https://eng-tours.vercel.app/p/abc-123" } },
  order_details: { title: "פרטי הזמנה (ידני)", usage: "כשאדמין לוחץ 'שלח ב-WhatsApp' בעמוד הזמנה", exampleVars: { event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" } },
  order_details_buyers: { title: "פרטי הזמנה לכל הרוכשים", usage: "כשאדמין לוחץ 'שלח לרוכשים' בעמוד הזמנה", exampleVars: { first_name: "דן", event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" } },
  supplier_new_order: { title: "הזמנה חדשה לספק", usage: "נשלח כשהזמנה עוברת לסטטוס supplier_review", exampleVars: { order_id: "A1B2C3D4", event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/supplier/order/abc" } },
  payment_confirmed: { title: "אישור תשלום", usage: "נשלח ללקוח כשהזמנה משולמת במלואה", exampleVars: { event_name: "פסטיבל איי יוון", amount: "5000", order_id: "A1B2C3D4" } },
  event_reminder: { title: "תזכורת לפני אירוע", usage: "נשלח אוטומטית N ימים לפני האירוע", exampleVars: { n: "7", event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" } },
  "2fa_code": { title: "קוד אימות 2FA", usage: "נשלח בעת התחברות עם אימות דו-שלבי", exampleVars: { code: "123456" } },
  new_order: { title: "הזמנה חדשה (למנהל)", usage: "נשלח למנהל על כל הזמנה חדשה שנוצרה", exampleVars: { id: "A1B2C3D4", event_name: "פסטיבל איי יוון" } },
  order_confirmed_airline: { title: "אישור חברת תעופה", usage: "נשלח לנוסעים אחרי אישור הספק של הטיסה", exampleVars: { confirmation: "AB1234" } },
  order_confirmed_customer: { title: "אישור ללקוח", usage: "נשלח ללקוח אחרי אישור סופי (status=confirmed)", exampleVars: { link: "https://eng-tours.vercel.app/p/abc-123" } },
  order_pending_supplier: { title: "הזמנה ממתינה לספק", usage: "נשלח לספק כשהזמנה ממתינה לאישורו", exampleVars: { id: "A1B2C3D4", link: "https://eng-tours.vercel.app/supplier/order/abc" } },
  partial_payment: { title: "תשלום חלקי", usage: "נשלח ללקוח על תשלום שלא הושלם במלואו", exampleVars: { id: "A1B2C3D4" } },
  supplier_approved: { title: "ספק אישר הזמנה", usage: "נשלח למנהל כשספק מאשר את הזמנה", exampleVars: { name: "אל על", id: "A1B2C3D4" } },
  supplier_issue: { title: "דיווח בעיה מספק", usage: "נשלח למנהל כשספק מדווח בעיה בהזמנה", exampleVars: { name: "אל על", id: "A1B2C3D4" } },
  low_stock: { title: "מלאי נמוך", usage: "התראה למנהל על מלאי נמוך", exampleVars: { n: "3", item_name: "מלון מרינה" } },
};

function applyTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } finally { setLoading(false); }
  }

  async function save(id: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, body: editBody }),
      });
      if (res.ok) {
        setEditing(null);
        load();
      } else {
        const d = await res.json();
        alert(d.error || "שגיאה");
      }
    } finally { setSaving(false); }
  }

  async function toggleChannel(t: Template, channel: Channel) {
    const current = t.channels || ["whatsapp"];
    const next = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel];
    if (next.length === 0) { alert("חובה להשאיר לפחות ערוץ אחד פעיל"); return; }
    setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, channels: next } : x));
    const res = await fetch("/api/whatsapp/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, channels: next }),
    });
    if (!res.ok) {
      setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, channels: current } : x));
      alert("שגיאה בעדכון");
    }
  }

  async function toggleActive(t: Template) {
    const newValue = t.is_active === false;
    // Optimistic update
    setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: newValue } : x));
    const res = await fetch("/api/whatsapp/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, is_active: newValue }),
    });
    if (!res.ok) {
      // revert
      setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: !newValue } : x));
      alert("שגיאה בעדכון");
    }
  }

  async function seedDefaults() {
    if (!confirm("להוסיף תבניות ברירת מחדל חסרות? (לא ידרוס קיימות)")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/whatsapp/templates/seed", { method: "POST" });
      const d = await res.json();
      alert(res.ok ? `נוספו ${d.added || 0} תבניות` : `שגיאה: ${d.error}`);
      load();
    } finally { setSeeding(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <Link href="/whatsapp" className="text-sm text-primary-700 hover:underline">← חזרה ל-WhatsApp</Link>
          <h2 className="text-2xl font-bold text-primary-900 mt-1">📝 תבניות הודעות</h2>
          <p className="text-sm text-gray-500 mt-1">עריכת תבניות + בחירת ערוצים (WhatsApp / SMS / Email) לכל תבנית</p>
        </div>
        <div className="flex gap-2">
          <button onClick={seedDefaults} disabled={seeding}
            className="text-sm bg-primary-700 text-white px-4 py-2 rounded-lg hover:bg-primary-800 disabled:opacity-50">
            {seeding ? "מוסיף..." : "➕ הוסף תבניות חסרות"}
          </button>
          <button
            onClick={async () => {
              if (!confirm("לאפס את כל התבניות לברירת המחדל? פעולה זו תדרוס כל שינוי שביצעת.")) return;
              const res = await fetch("/api/whatsapp/templates/reset-all", { method: "POST" });
              const d = await res.json();
              alert(res.ok ? `${d.restored} תבניות שוחזרו` : "שגיאה");
              load();
            }}
            className="text-sm border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50"
          >
            🔄 אפס הכל לברירת מחדל
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-gray-500 mb-4">אין תבניות עדיין</p>
          <button onClick={seedDefaults} className="bg-primary-700 text-white px-5 py-2 rounded-lg">
            ➕ הוסף תבניות ברירת מחדל
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => {
            const meta = TEMPLATE_DESCRIPTIONS[t.name];
            const isEditing = editing === t.id;
            const preview = applyTemplate(isEditing ? editBody : t.body, meta?.exampleVars || {});
            const isActive = t.is_active !== false;
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
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-gray-500">נשלח ב:</span>
                      {(["whatsapp", "sms", "email"] as Channel[]).map((ch) => {
                        const active = (t.channels || ["whatsapp"]).includes(ch);
                        const m = CHANNEL_META[ch];
                        return (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => toggleChannel(t, ch)}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all ${
                              active
                                ? (ch === "whatsapp" ? "bg-green-100 text-green-800 border-green-300"
                                   : ch === "sms" ? "bg-blue-100 text-blue-800 border-blue-300"
                                   : "bg-purple-100 text-purple-800 border-purple-300")
                                : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                            }`}
                            title={active ? `לחץ לביטול ${m.label}` : `לחץ להפעלת ${m.label}`}
                          >
                            {active ? "✓" : "○"} {m.icon} {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Toggle switch */}
                    <label className="flex items-center gap-2 cursor-pointer" title={isActive ? "לחץ לכיבוי" : "לחץ להפעלה"}>
                      <span className={`text-xs font-medium ${isActive ? "text-green-700" : "text-gray-400"}`}>
                        {isActive ? "פעיל" : "כבוי"}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleActive(t)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-green-500" : "bg-gray-300"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-1" : "translate-x-6"}`} />
                      </button>
                    </label>
                    {!isEditing && (
                      <button onClick={() => { setEditing(t.id); setEditBody(t.body); }}
                        className="text-xs bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1.5 rounded hover:bg-primary-100">
                        ✏️ ערוך
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">תוכן התבנית:</div>
                    {isEditing ? (
                      <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)}
                        rows={6}
                        className="w-full border border-primary-300 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <pre className="bg-gray-50 rounded-lg p-3 text-sm whitespace-pre-wrap border border-gray-200 font-mono">{t.body}</pre>
                    )}
                    {t.variables?.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        <span className="text-xs text-gray-500">משתנים זמינים:</span>
                        {t.variables.map((v) => (
                          <code key={v} className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded" dir="ltr">{`{{${v}}}`}</code>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-1">תצוגה מקדימה (עם ערכים לדוגמה):</div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm whitespace-pre-wrap">{preview}</div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => save(t.id)} disabled={saving}
                      className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50">
                      {saving ? "שומר..." : "💾 שמור"}
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                      ביטול
                    </button>
                    <button onClick={async () => {
                      const res = await fetch(`/api/whatsapp/templates/default?name=${t.name}`);
                      const d = await res.json();
                      if (d.body) setEditBody(d.body);
                    }}
                      className="text-xs text-gray-500 hover:text-primary-700 mr-auto self-center">
                      🔄 שחזר ברירת מחדל
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
