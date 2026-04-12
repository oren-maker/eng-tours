"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ])
      .then(([eventsData, ordersData]) => {
        if (Array.isArray(eventsData)) setEvents(eventsData);
        if (Array.isArray(ordersData)) setOrders(ordersData);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeEvents = events.filter((e) => e.status === "active" && (!e.end_date || e.end_date.split("T")[0] >= today));
  const archivedEvents = events.filter((e) => e.status === "archived" || (e.end_date && e.end_date.split("T")[0] < today));

  const totalOrders = orders.length;
  const pendingPayment = orders.filter((o) => o.status === "pending_payment").length;
  const confirmed = orders.filter((o) => o.status === "confirmed").length;
  const incomplete = orders.filter((o) => o.status === "draft" || o.status === "partial").length;

  const typeLabels: Record<string, string> = {
    RF: "מלון בלבד", FL: "טיסות בלבד", RL: "טיסות + מלון חו\"ל",
    IL: "מלון בארץ", FI: "מלון + טיסות בארץ",
  };
  const typeBadgeColors: Record<string, string> = {
    RF: "bg-purple-100 text-purple-700",
    FL: "bg-blue-100 text-blue-700",
    RL: "bg-green-100 text-green-700",
    IL: "bg-orange-100 text-orange-700",
    FI: "bg-red-100 text-red-700",
  };

  // Count orders per event
  function eventOrderCount(eventId: string) {
    return orders.filter((o) => o.event_id === eventId).length;
  }
  function eventRevenue(eventId: string) {
    return orders
      .filter((o) => o.event_id === eventId && (o.status === "confirmed" || o.status === "completed"))
      .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">דשבורד</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-primary-500">
          <div className="text-2xl mb-1">📋</div>
          <div className="text-2xl font-bold text-gray-800">{totalOrders}</div>
          <div className="text-xs text-gray-500 mt-1">סה״כ הזמנות</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-green-500">
          <div className="text-2xl mb-1">🎪</div>
          <div className="text-2xl font-bold text-gray-800">{activeEvents.length}</div>
          <div className="text-xs text-gray-500 mt-1">אירועים פעילים</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-yellow-500">
          <div className="text-2xl mb-1">⏳</div>
          <div className="text-2xl font-bold text-gray-800">{pendingPayment}</div>
          <div className="text-xs text-gray-500 mt-1">ממתינות לאישור</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-red-500">
          <div className="text-2xl mb-1">⚠️</div>
          <div className="text-2xl font-bold text-gray-800">{incomplete}</div>
          <div className="text-xs text-gray-500 mt-1">לא הושלמו</div>
        </div>
      </div>

      {/* Events list with data */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">רשימת אירועים</h3>
          <span className="text-sm text-gray-500">{activeEvents.length} אירועים פעילים</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">טוען...</div>
        ) : activeEvents.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">🎪</div>
            <p className="text-lg font-medium text-gray-500">אין אירועים פעילים</p>
            <Link href="/events/new" className="inline-block mt-4 bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
              + צור אירוע חדש
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeEvents.map((ev) => {
              const ordersCount = eventOrderCount(ev.id);
              const revenue = eventRevenue(ev.id);
              return (
                <div key={ev.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-800">{ev.name}</h4>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeColors[ev.type_code] || "bg-gray-100 text-gray-700"}`}>
                          {typeLabels[ev.type_code] || ev.type_code}
                        </span>
                        {ev.destination_country && (
                          <span className="text-xs text-gray-500">📍 {ev.destination_country}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>🆔 {ev.id}</span>
                        {ev.start_date && <span>📅 {new Date(ev.start_date).toLocaleDateString("he-IL")}</span>}
                        <span>📋 {ordersCount} הזמנות</span>
                        {revenue > 0 && <span className="text-green-600 font-medium">💰 ₪{revenue.toLocaleString("he-IL")}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/events/${ev.id}/dashboard`} className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors">
                        📊 צפה בנתונים
                      </Link>
                      <Link href={`/events/${ev.id}`} className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                        ✏️
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {archivedEvents.length > 0 && (
          <div className="p-4 border-t border-gray-100 text-center">
            <Link href="/events" className="text-sm text-gray-500 hover:text-primary-700">
              📦 ראה {archivedEvents.length} אירועים בארכיון
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
