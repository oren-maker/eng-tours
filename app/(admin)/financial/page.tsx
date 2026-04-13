"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cachedFetch } from "@/lib/cached-fetch";

const typeBadgeColors: Record<string, string> = {
  RF: "bg-purple-100 text-purple-700",
  FL: "bg-blue-100 text-blue-700",
  RL: "bg-green-100 text-green-700",
  IL: "bg-orange-100 text-orange-700",
  FI: "bg-red-100 text-red-700",
};

const typeLabels: Record<string, string> = {
  RF: "מלון בלבד",
  FL: "טיסות בלבד",
  RL: "טיסות + מלון חו\"ל",
  IL: "מלון בארץ",
  FI: "מלון + טיסות בארץ",
};

export default function FinancialPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"active" | "archive">("active");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      cachedFetch<any[]>("/api/events"),
      cachedFetch<any[]>("/api/orders"),
    ])
      .then(([evData, orData]) => {
        if (Array.isArray(evData)) setEvents(evData);
        if (Array.isArray(orData)) setOrders(orData);
      })
      .finally(() => setLoading(false));
  }, []);

  function eventRevenue(eventId: string) {
    return orders
      .filter((o) => o.event_id === eventId && o.status !== "cancelled" && o.status !== "draft")
      .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  }

  function eventOrderCount(eventId: string) {
    return orders.filter((o) => o.event_id === eventId).length;
  }

  const activeEvents = events.filter(
    (e) => e.status === "active" && (!e.end_date || e.end_date.split("T")[0] >= today)
  );
  const archivedEvents = events.filter(
    (e) => e.status === "archived" || (e.end_date && e.end_date.split("T")[0] < today)
  );

  const searchLower = search.trim().toLowerCase();
  const displayedEvents = (view === "active" ? activeEvents : archivedEvents)
    .filter((e) => !searchLower ||
      e.name?.toLowerCase().includes(searchLower) ||
      e.id?.toLowerCase().includes(searchLower) ||
      e.destination_country?.toLowerCase().includes(searchLower)
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-primary-900">💰 כלכלי</h2>
        <p className="text-sm text-gray-500">בחר אירוע כדי לצפות בנתונים הכלכליים המלאים</p>
      </div>

      {/* Toggle */}
      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-1 mb-4">
        <button
          onClick={() => setView("active")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === "active" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          אירועים פעילים ({activeEvents.length})
        </button>
        <button
          onClick={() => setView("archive")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === "archive" ? "bg-gray-700 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          📦 ארכיון ({archivedEvents.length})
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 חפש אירוע לפי שם, מזהה או יעד..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
        />
      </div>

      {/* Events list */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-12 text-gray-400">טוען...</div>
      ) : displayedEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">💰</div>
          <p className="text-lg font-medium text-gray-500">
            {search ? "לא נמצאו תוצאות" : view === "active" ? "אין אירועים פעילים" : "אין אירועים בארכיון"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedEvents.map((ev) => {
            const revenue = eventRevenue(ev.id);
            const orderCount = eventOrderCount(ev.id);
            return (
              <Link
                key={ev.id}
                href={`/events/${ev.id}/dashboard`}
                className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all border-2 border-transparent hover:border-primary-200"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 truncate">{ev.name}</h3>
                    {ev.destination_country && (
                      <p className="text-xs text-gray-500 mt-1">📍 {ev.destination_country}</p>
                    )}
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${typeBadgeColors[ev.type_code] || "bg-gray-100 text-gray-700"}`}>
                    {typeLabels[ev.type_code] || ev.type_code}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>🆔</span>
                    <span className="font-mono">{ev.id}</span>
                  </div>
                  {ev.start_date && (
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{new Date(ev.start_date).toLocaleDateString("he-IL")}</span>
                      {ev.end_date && <span>← {new Date(ev.end_date).toLocaleDateString("he-IL")}</span>}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-500">הזמנות</div>
                    <div className="text-lg font-bold text-gray-800">{orderCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">הכנסות</div>
                    <div className="text-lg font-bold text-green-600">₪{revenue.toLocaleString("he-IL")}</div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-primary-700 font-medium text-center">
                  📊 צפה בנתונים כלכליים מלאים →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
