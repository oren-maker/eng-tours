"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Page = { id: string; slug: string; title: string };
type Affiliate = {
  id: string; name: string; phone: string | null; email: string | null;
  tracking_code: string; clicks: number; leads_count: number;
  created_at: string;
};

export default function LinksPage({ params }: { params: { id: string } }) {
  const [page, setPage] = useState<Page | null>(null);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch(`/api/admin/marketing/pages/${params.id}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/admin/marketing/pages/${params.id}/affiliates`, { cache: "no-store" }).then((r) => r.json()),
    ]);
    if (r1.page) setPage(r1.page);
    setAffiliates(r2.affiliates || []);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/marketing/pages/${params.id}/affiliates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "שגיאה"); return; }
      setName(""); setPhone(""); setEmail("");
      await load();
    } finally { setAdding(false); }
  }

  async function remove(affId: string, affName: string) {
    if (!confirm(`למחוק את "${affName}"? הלידים שלו יישארו אבל לא ישויכו.`)) return;
    const res = await fetch(`/api/admin/marketing/pages/${params.id}/affiliates/${affId}`, { method: "DELETE" });
    if (!res.ok) { alert("שגיאה"); return; }
    await load();
  }

  function copyLink(code: string) {
    if (!page) return;
    const url = `${origin}/m/${page.slug}?ref=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("הקישור הועתק ✓\n\n" + url);
    });
  }

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!page) return <div className="text-center py-12 text-gray-400">לא נמצא</div>;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 flex-wrap">
        <Link href="/marketing/pages" className="hover:text-primary-700">📄 עמודי שיווק</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{page.title}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-1 mb-4 overflow-x-auto">
        <Link href={`/marketing/pages/${params.id}/dashboard`} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">📊 דשבורד</Link>
        <Link href={`/marketing/pages/${params.id}/leads`} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">📋 לידים</Link>
        <Link href={`/marketing/pages/${params.id}/links`} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-700 text-white whitespace-nowrap">🔗 קישורי מעקב</Link>
        <Link href={`/marketing/pages/${params.id}`} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">✏️ עריכה</Link>
      </div>

      {/* Add new */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-semibold text-gray-800 mb-3">+ הוסף קישור מעקב חדש</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם האדם / החנות *"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="טלפון (אופציונלי)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" dir="ltr" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="מייל (אופציונלי)"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" dir="ltr" />
        </div>
        <button onClick={add} disabled={adding || !name.trim()}
          className="mt-3 bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
          {adding ? "יוצר..." : "+ צור קישור"}
        </button>
        <p className="text-xs text-gray-500 mt-2">קוד מעקב ייווצר אוטומטית. ניתן להעתיק את הקישור המלא בלחיצה.</p>
      </div>

      {/* List */}
      {affiliates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🔗</div>
          <p className="text-lg">אין קישורי מעקב עדיין</p>
          <p className="text-xs mt-2">הוסף אדם בטופס למעלה ותקבל קישור ייחודי שלו</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">שם</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">פרטי קשר</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">קישור</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">כניסות</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">לידים</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">המרה</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {affiliates.map((a) => {
                  const conv = a.clicks > 0 ? Math.round((a.leads_count / a.clicks) * 100) : 0;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium text-gray-800">{a.name}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {a.phone && <div className="font-mono" dir="ltr">{a.phone}</div>}
                        {a.email && <div className="font-mono" dir="ltr">{a.email}</div>}
                        {!a.phone && !a.email && "—"}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => copyLink(a.tracking_code)}
                          className="text-xs bg-primary-700 text-white px-3 py-1.5 rounded hover:bg-primary-800 inline-flex items-center gap-1">
                          📋 העתק קישור
                        </button>
                      </td>
                      <td className="px-3 py-3"><span className="text-lg font-bold text-purple-700">{a.clicks}</span></td>
                      <td className="px-3 py-3">
                        {a.leads_count > 0 ? (
                          <Link href={`/marketing/pages/${params.id}/leads?aff=${a.id}`}
                            className="text-lg font-bold text-green-700 hover:text-green-800 hover:underline">
                            {a.leads_count}
                          </Link>
                        ) : (
                          <span className="text-lg font-bold text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">{a.clicks > 0 ? `${conv}%` : "—"}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => remove(a.id, a.name)} className="text-xs text-red-600 hover:text-red-800">🗑 מחק</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
