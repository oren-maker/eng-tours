"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EventActions from "./event-actions";
import { cachedFetch } from "@/lib/cached-fetch";

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
  const [orders, setOrders] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"active" | "archive">("active");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      cachedFetch<any[]>("/api/events"),
      cachedFetch<any[]>("/api/orders"),
      cachedFetch<any[]>("/api/coupons").catch(() => []),
    ])
      .then(([evData, orData, coData]) => {
        if (Array.isArray(evData)) setEvents(evData);
        else setError((evData as any).error || "שגיאה");
        if (Array.isArray(orData)) setOrders(orData);
        if (Array.isArray(coData)) setCoupons(coData);
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }, []);

  function eventStats(eventId: string) {
    const evOrders = orders.filter((o) => o.event_id === eventId);
    return {
      total: evOrders.length,
      confirmed: evOrders.filter((o) => o.status === "confirmed" || o.status === "completed" || o.status === "supplier_approved").length,
      pending: evOrders.filter((o) => o.status === "pending_payment" || o.status === "partial").length,
      supplier_review: evOrders.filter((o) => o.status === "supplier_review").length,
    };
  }

  function couponsForEvent(eventId: string) {
    return coupons.filter((c) => c.event_id === eventId).length;
  }

  const activeEvents = events.filter((e) => e.status === "active" && (!e.end_date || e.end_date.split("T")[0] >= today));
  const archivedEvents = events.filter((e) => e.status === "archived" || (e.end_date && e.end_date.split("T")[0] < today));
  const displayedEvents = view === "active" ? activeEvents : archivedEvents;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-primary-900">אירועים</h2>
        <div className="flex gap-2">
          <Link
            href="/coupons"
            className="border border-primary-300 text-primary-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
          >
            רשימת קופונים
          </Link>
          <Link
            href="/events/new"
            className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
          >
            + אירוע חדש
          </Link>
        </div>
      </div>

      {/* Active/Archive toggle */}
      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-1 mb-4">
        <button
          onClick={() => setView("active")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            view === "active" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          פעילים ({activeEvents.length})
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

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-12 text-gray-400">טוען...</div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm text-center text-red-500 py-12">שגיאה: {error}</div>
      ) : displayedEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center text-gray-400 py-16">
          <div className="text-5xl mb-4">🎪</div>
          <p className="text-lg font-medium text-gray-500">
            {view === "active" ? "אין אירועים פעילים" : "אין אירועים בארכיון"}
          </p>
          {view === "active" && (
            <Link href="/events/new" className="inline-block mt-4 bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
              + אירוע חדש
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedEvents.map((event: any) => {
            const stats = eventStats(event.id);
            const couponCount = couponsForEvent(event.id);
            return (
              <div key={event.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-800">{event.name}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${typeBadgeColors[event.type_code] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {typeLabels[event.type_code] || event.type_code}
                      </span>
                      <span className="font-mono text-xs text-gray-400">🆔 {event.id}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      {event.destination_country && <span>📍 {event.destination_country}</span>}
                      {event.start_date && <span>📅 {new Date(event.start_date).toLocaleDateString("he-IL")}</span>}
                      <span>{event.mode === "registration" ? "הרשמה" : "תשלום"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/events/${event.id}/dashboard`} className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800">
                      📊 צפה
                    </Link>
                    <EventActions eventId={event.id} status={event.status} />
                    <Link
                      href={`/coupons?event=${event.id}`}
                      className="text-xs text-primary-700 hover:text-primary-900 px-3 py-1 rounded border border-primary-200 hover:bg-primary-50 font-medium"
                    >
                      קופונים {couponCount > 0 && `(${couponCount})`}
                    </Link>
                  </div>
                </div>

                {/* Order stats - clickable */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/orders?event=${event.id}`}
                    className="bg-gray-50 hover:bg-gray-100 p-3 rounded-lg text-center transition-colors"
                  >
                    <div className="text-xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-xs text-gray-500">סה״כ הזמנות</div>
                  </Link>
                  <Link
                    href={`/orders?event=${event.id}&status=confirmed`}
                    className="bg-green-50 hover:bg-green-100 p-3 rounded-lg text-center transition-colors"
                  >
                    <div className="text-xl font-bold text-green-700">{stats.confirmed}</div>
                    <div className="text-xs text-green-600">מאושרות</div>
                  </Link>
                  <Link
                    href={`/orders?event=${event.id}&status=pending_payment`}
                    className="bg-yellow-50 hover:bg-yellow-100 p-3 rounded-lg text-center transition-colors"
                  >
                    <div className="text-xl font-bold text-yellow-700">{stats.pending}</div>
                    <div className="text-xs text-yellow-600">ממתינות</div>
                  </Link>
                  <Link
                    href={`/orders?event=${event.id}&status=supplier_review`}
                    className="bg-purple-50 hover:bg-purple-100 p-3 rounded-lg text-center transition-colors"
                  >
                    <div className="text-xl font-bold text-purple-700">{stats.supplier_review}</div>
                    <div className="text-xs text-purple-600">מחכות לאישור</div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
