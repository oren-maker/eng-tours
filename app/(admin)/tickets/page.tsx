"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cachedFetch } from "@/lib/cached-fetch";

function currencySymbol(c?: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

const typeLabels: Record<string, string> = {
  RF: "מלון בלבד", FL: "טיסות בלבד", RL: "טיסות + מלון חו\"ל",
  IL: "מלון בארץ", FI: "מלון + טיסות בארץ",
};

export default function TicketsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      cachedFetch<any[]>("/api/events"),
      cachedFetch<any[]>("/api/tickets"),
    ])
      .then(([evData, tkData]) => {
        if (Array.isArray(evData)) setEvents(evData.filter((e: any) => e.status === "active"));
        else setError((evData as any).error || "שגיאה");
        if (Array.isArray(tkData)) setTickets(tkData);
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }, []);

  function eventTickets(eventId: string) {
    return tickets.filter((t) => t.event_id === eventId);
  }

  function eventInventory(eventId: string) {
    const evTickets = eventTickets(eventId);
    const total = evTickets.reduce((s, t) => s + (t.total_qty || 0), 0);
    const booked = evTickets.reduce((s, t) => s + (t.booked_qty || 0), 0);
    return { total, booked, count: evTickets.length };
  }

  const upcomingEvents = events.filter((e) => !e.end_date || e.end_date.split("T")[0] >= today);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-primary-900">כרטיסים</h2>
        <Link
          href="/tickets/new"
          className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          + כרטיס חדש
        </Link>
      </div>

      <p className="text-sm text-gray-500 mb-4">בחר אירוע כדי לנהל את הכרטיסים שלו</p>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-12 text-gray-400">טוען...</div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm text-center text-red-500 py-12">שגיאה: {error}</div>
      ) : upcomingEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🎫</div>
          <p className="text-lg font-medium text-gray-500">אין אירועים פעילים</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">אירוע</th>
                  <th className="text-right px-4 py-3 font-medium">סוג</th>
                  <th className="text-right px-4 py-3 font-medium">יעד</th>
                  <th className="text-right px-4 py-3 font-medium">תאריך</th>
                  <th className="text-right px-4 py-3 font-medium">כרטיסים</th>
                  <th className="text-right px-4 py-3 font-medium">מצב מלאי</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingEvents.map((ev) => {
                  const inv = eventInventory(ev.id);
                  const occupancy = inv.total > 0 ? Math.round((inv.booked / inv.total) * 100) : 0;
                  return (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{ev.name}</div>
                        <div className="font-mono text-xs text-gray-400">{ev.id}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {typeLabels[ev.type_code] || ev.type_code}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ev.destination_country || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {ev.start_date ? new Date(ev.start_date).toLocaleDateString("he-IL") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          inv.count > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {inv.count} סוגים
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.count === 0 ? (
                          <span className="text-xs text-gray-400">אין כרטיסים</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 whitespace-nowrap">{inv.booked}/{inv.total}</span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  occupancy >= 90 ? "bg-red-500" :
                                  occupancy >= 70 ? "bg-yellow-500" :
                                  "bg-green-500"
                                }`}
                                style={{ width: `${Math.min(occupancy, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{occupancy}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/tickets/event/${ev.id}`}
                          className="text-primary-700 hover:text-primary-900 text-xs px-3 py-1 rounded border border-primary-200 hover:bg-primary-50 font-medium"
                        >
                          נהל כרטיסים
                        </Link>
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
