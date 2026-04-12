"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EventActions from "./event-actions";

const typeBadgeColors: Record<string, string> = {
  RF: "bg-purple-100 text-purple-700 border-purple-200",
  FL: "bg-blue-100 text-blue-700 border-blue-200",
  RL: "bg-green-100 text-green-700 border-green-200",
  IL: "bg-orange-100 text-orange-700 border-orange-200",
  FI: "bg-red-100 text-red-700 border-red-200",
};

const typeLabels: Record<string, string> = {
  RF: "מלון בלבד",
  FL: "טיסות בלבד",
  RL: "טיסות + מלון בחו\"ל",
  IL: "מלון בארץ",
  FI: "מלון + טיסות בארץ",
};

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
        else setError(data.error || "שגיאה בטעינה");
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-900">אירועים</h2>
        <div className="flex gap-2">
          <Link
            href="/coupons"
            className="border border-primary-300 text-primary-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
          >
            🏷️ קופונים
          </Link>
          <Link
            href="/events/new"
            className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
          >
            + אירוע חדש
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">טוען...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-12">שגיאה: {error}</div>
        ) : events.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">🎪</div>
            <p className="text-lg font-medium text-gray-500">אין אירועים עדיין</p>
            <Link
              href="/events/new"
              className="inline-block mt-4 bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              + אירוע חדש
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">מזהה</th>
                  <th className="text-right px-4 py-3 font-medium">שם</th>
                  <th className="text-right px-4 py-3 font-medium">סוג</th>
                  <th className="text-right px-4 py-3 font-medium">תאריך</th>
                  <th className="text-right px-4 py-3 font-medium">מצב</th>
                  <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event: any) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{event.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{event.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${typeBadgeColors[event.type_code] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {typeLabels[event.type_code] || event.type_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {event.start_date ? new Date(event.start_date).toLocaleDateString("he-IL") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {event.mode === "registration" ? "הרשמה" : "תשלום"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${event.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {event.status === "active" ? "פעיל" : "ארכיון"}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1">
                      <EventActions eventId={event.id} status={event.status} />
                      <Link
                        href={`/coupons?event=${event.id}`}
                        className="text-xs text-primary-700 hover:text-primary-900 px-3 py-1 rounded border border-primary-200 hover:bg-primary-50 font-medium"
                      >
                        צור קופון
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
