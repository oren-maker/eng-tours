"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CompanyInfoPage() {
  const [data, setData] = useState({
    company_name: "", company_tagline: "", company_phone: "", company_email: "",
    company_website: "", company_address: "", company_vat_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/company-info").then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/company-info", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); } else alert("שגיאה");
  }

  function set(k: string, v: string) { setData({ ...data, [k]: v }); }

  const fields: { key: string; label: string; placeholder: string; type?: string; dir?: "ltr" | "rtl" }[] = [
    { key: "company_name", label: "שם החברה", placeholder: "ENG TOURS" },
    { key: "company_tagline", label: "סלוגן", placeholder: "חוויות טיולים מותאמות אישית" },
    { key: "company_phone", label: "טלפון", placeholder: "03-1234567", dir: "ltr" },
    { key: "company_email", label: "מייל", placeholder: "info@eng-tours.com", type: "email", dir: "ltr" },
    { key: "company_website", label: "אתר", placeholder: "https://eng-tours.com", type: "url", dir: "ltr" },
    { key: "company_address", label: "כתובת", placeholder: "רחוב דיזנגוף 100, תל אביב" },
    { key: "company_vat_id", label: "מס' עוסק מורשה / ח.פ.", placeholder: "123456789", dir: "ltr" },
  ];

  return (
    <div>
      <Link href="/settings-hub" className="text-sm text-primary-700 hover:underline">← חזרה להגדרות</Link>
      <h2 className="text-2xl font-bold text-primary-900 mt-1 mb-1">🏢 פרטי החברה</h2>
      <p className="text-sm text-gray-500 mb-6">הפרטים האלה מוצגים במיילים, ב-PDF של הזמנות, ובחתימות המערכת.</p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input
                  type={f.type || "text"}
                  value={(data as any)[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  dir={f.dir || "auto"}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
            <button onClick={save} disabled={saving} className="bg-primary-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50">
              {saving ? "שומר..." : "💾 שמור"}
            </button>
            {saved && <span className="text-sm text-green-700">✓ נשמר בהצלחה</span>}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <div className="font-semibold mb-1">💡 איפה הפרטים מופיעים:</div>
            <ul className="text-xs list-disc list-inside space-y-0.5">
              <li>Footer של כל מייל שהמערכת שולחת (Resend)</li>
              <li>Header של PDF הזמנה</li>
              <li>עמוד תודה אחרי הזמנה</li>
              <li>חתימת אדמין</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
