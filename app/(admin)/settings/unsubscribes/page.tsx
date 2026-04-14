"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function UnsubscribesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/unsubscribes");
    const d = await res.json();
    setItems(d.items || []);
    setLoading(false);
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

  return (
    <div>
      <Link href="/settings-hub" className="text-sm text-primary-700 hover:underline">← חזרה להגדרות</Link>
      <h2 className="text-2xl font-bold text-primary-900 mt-1 mb-1">🚫 מיילים מוסרים</h2>
      <p className="text-sm text-gray-500 mb-6">
        רשימת כתובות שביקשו להסיר עצמן מרשימת התפוצה. המערכת לא תשלח להם יותר מיילים.
      </p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-4xl mb-2">📬</div>
          <p className="text-gray-500">אף אחד עדיין לא הסיר את עצמו</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
      )}
    </div>
  );
}
