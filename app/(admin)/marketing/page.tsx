"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function MarketingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [consentOnly, setConsentOnly] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function load() {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch("/api/admin/marketing/contacts").then((r) => r.json()),
      fetch("/api/email/templates").then((r) => r.json()),
    ]);
    setData(r1); setTemplates(r2.templates || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function send() {
    if (!selectedTemplate) { alert("בחר תבנית"); return; }
    const count = consentOnly
      ? (data?.contacts || []).filter((c: any) => c.marketing_consent && c.email && !c.unsubscribed).length
      : (data?.contacts || []).filter((c: any) => c.email && !c.unsubscribed).length;
    if (!confirm(`לשלוח דיוור ל-${count} נמענים? (תבנית: ${selectedTemplate})`)) return;
    setSending(true); setResult(null);
    try {
      const res = await fetch("/api/admin/marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_name: selectedTemplate, consent_only: consentOnly }),
      });
      const d = await res.json();
      setResult(d);
    } finally { setSending(false); }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;

  const s = data?.stats || {};
  const byCountry = Object.entries(s.by_country || {}).sort((a: any, b: any) => b[1] - a[1]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-900">📢 שיווק</h2>
        <p className="text-sm text-gray-500 mt-1">ניהול רשימת התפוצה, ייצוא ודיוור ללקוחות</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-blue-500">
          <div className="text-xs text-gray-500">סה״כ מיילים</div>
          <div className="text-2xl font-bold text-gray-800">{s.total_emails || 0}</div>
          <div className="text-xs text-blue-600 mt-1">{s.unique_emails || 0} ייחודיים (אחרי ניכוי כפילויות)</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-green-500">
          <div className="text-xs text-gray-500">סה״כ טלפונים</div>
          <div className="text-2xl font-bold text-gray-800">{s.total_phones || 0}</div>
          <div className="text-xs text-green-600 mt-1">{s.unique_phones || 0} ייחודיים</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-primary-500">
          <div className="text-xs text-gray-500">אישרו דיוור</div>
          <div className="text-2xl font-bold text-primary-700">{s.marketing_consent_count || 0}</div>
          <div className="text-xs text-gray-500 mt-1">חתמו על הסכמת שיווק</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-r-4 border-red-500">
          <div className="text-xs text-gray-500">הסירו עצמם</div>
          <div className="text-2xl font-bold text-red-700">{s.unsubscribed_emails || 0}</div>
          <div className="text-xs text-gray-500 mt-1">לא יקבלו דיוור</div>
        </div>
      </div>

      {/* By country */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">🌍 פילוח לפי מדינה (על פי קידומת טלפון)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {byCountry.map(([country, count]: any) => (
            <div key={country} className="flex justify-between bg-gray-50 rounded px-3 py-2 text-sm">
              <span className="text-gray-700">{country}</span>
              <span className="font-bold text-primary-700">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Export */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-3">📊 ייצוא נתונים</h3>
          <p className="text-sm text-gray-600 mb-4">
            הורד רשימה מלאה של כל אנשי הקשר במערכת (עם ניכוי כפילויות) בפורמט CSV — ניתן לפתוח באקסל.
          </p>
          <a href="/api/admin/marketing/export"
            className="inline-block bg-green-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-700">
            📥 הורד כ-CSV (Excel)
          </a>
          <p className="text-xs text-gray-500 mt-3">
            הקובץ כולל: מייל, טלפון, שם, מדינה, הסכמת שיווק, מקור (הזמנה/משתמש), תאריך, סטטוס הסרה
          </p>
        </div>

        {/* Bulk send */}
        <div className="bg-white rounded-xl shadow-sm p-5 border-2 border-primary-100">
          <h3 className="font-semibold text-gray-800 mb-3">📧 דיוור לכל הלקוחות</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">בחר תבנית:</label>
              <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— בחר תבנית —</option>
                {templates.filter((t) => t.is_active !== false).map((t) => (
                  <option key={t.id} value={t.name}>{t.subject} ({t.name})</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                לא מוצא תבנית? <Link href="/email/templates" className="text-primary-700 hover:underline">צור/ערוך ב-תבניות מייל</Link>
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={consentOnly} onChange={(e) => setConsentOnly(e.target.checked)}
                className="w-4 h-4 text-primary-700 rounded" />
              <span className="text-gray-700">שלח רק למי שסימן הסכמה שיווקית (מומלץ)</span>
            </label>
            <button onClick={send} disabled={sending || !selectedTemplate}
              className="w-full bg-primary-700 text-white py-3 rounded-lg font-medium hover:bg-primary-800 disabled:opacity-50">
              {sending ? "שולח..." : "📤 שלח דיוור"}
            </button>
            <p className="text-[11px] text-gray-500">
              נמענים שהסירו עצמם יידלגו אוטומטית. מושבת קצב שליחה למניעת חסימה.
            </p>
          </div>
          {result && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${result.sent > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <div className="font-semibold">תוצאה:</div>
              <div>נשלחו: <b>{result.sent}</b> / {result.total}</div>
              <div>דולגו (הוסרו/לא הסכימו): {result.skipped}</div>
              {result.failed > 0 && <div className="text-red-700">נכשלו: {result.failed}</div>}
              {result.errors?.length > 0 && (
                <details className="mt-2 text-xs"><summary className="cursor-pointer">פרטי שגיאות</summary>
                  <ul className="mt-1 list-disc list-inside">
                    {result.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contacts preview */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 mb-3">📋 תצוגה מקדימה של אנשי הקשר ({data?.contacts?.length || 0})</h3>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-right px-3 py-2 font-medium text-gray-600">שם</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">מייל</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">טלפון</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">מדינה</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">הסכמה</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">מקור</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data?.contacts || []).slice(0, 100).map((c: any, i: number) => (
                <tr key={i} className={c.unsubscribed ? "opacity-40 line-through" : ""}>
                  <td className="px-3 py-1.5 text-xs">{c.first_name} {c.last_name}</td>
                  <td className="px-3 py-1.5 text-xs font-mono" dir="ltr">{c.email || "—"}</td>
                  <td className="px-3 py-1.5 text-xs font-mono" dir="ltr">{c.phone || "—"}</td>
                  <td className="px-3 py-1.5 text-xs">{c.country || "—"}</td>
                  <td className="px-3 py-1.5 text-xs">
                    {c.marketing_consent ? "✓ כן" : "לא"}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-gray-500">{c.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.contacts?.length > 100 && (
            <p className="text-xs text-gray-500 text-center mt-3">מציג 100 ראשונים · סה״כ {data.contacts.length} · הורד CSV לרשימה המלאה</p>
          )}
        </div>
      </div>
    </div>
  );
}
