"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AirlinesPage() {
  const [airlines, setAirlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/airlines")
      .then((r) => r.json())
      .then((data) => Array.isArray(data) ? setAirlines(data) : setError(data.error || "שגיאה"))
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-900">חברות תעופה</h2>
        <Link href="/airlines/new" className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors">
          + חברת תעופה חדשה
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">טוען...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-12">שגיאה: {error}</div>
        ) : airlines.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">✈️</div>
            <p className="text-lg font-medium text-gray-500">אין חברות תעופה עדיין</p>
            <Link href="/airlines/new" className="inline-block mt-4 bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
              + חברת תעופה חדשה
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">שם</th>
                  <th className="text-right px-4 py-3 font-medium">מדינה</th>
                  <th className="text-right px-4 py-3 font-medium">קוד IATA</th>
                  <th className="text-right px-4 py-3 font-medium">איש קשר</th>
                  <th className="text-right px-4 py-3 font-medium">טלפון</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {airlines.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                    <td className="px-4 py-3 text-gray-600">{a.country || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{a.iata_code || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{a.contact_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs" dir="ltr">{a.contact_phone || "—"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/airlines/${a.id}/flights`} className="text-primary-600 hover:text-primary-800 text-xs px-2 py-1 rounded hover:bg-primary-50">
                        ✈️ נהל טיסות
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
