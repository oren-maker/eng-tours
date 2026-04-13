"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cachedFetch } from "@/lib/cached-fetch";

function currencySymbol(c?: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

export default function PackagesPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      cachedFetch<any[]>("/api/events"),
      cachedFetch<any[]>("/api/flights"),
      cachedFetch<any[]>("/api/rooms"),
      cachedFetch<any[]>("/api/tickets"),
      cachedFetch<any>("/api/orders"),
    ])
      .then(([eventsData, flightsData, roomsData, ticketsData, ordersData]) => {
        if (Array.isArray(eventsData)) setEvents(eventsData.filter((e: any) => e.status === "active"));
        if (Array.isArray(flightsData)) setFlights(flightsData);
        if (Array.isArray(roomsData)) setRooms(roomsData);
        if (Array.isArray(ticketsData)) setTickets(ticketsData);
        const ordersList = Array.isArray(ordersData) ? ordersData : (ordersData?.orders || []);
        const counts: Record<string, number> = {};
        for (const o of ordersList) {
          if (o.status === "cancelled" || o.status === "draft") continue;
          const evId = o.event_id;
          if (!evId) continue;
          counts[evId] = (counts[evId] || 0) + 1;
        }
        setOrderCounts(counts);
      })
      .finally(() => setLoading(false));
  }, []);

  function eventResources(eventId: string) {
    const evFlights = flights.filter((f) => f.event_id === eventId);
    const evRooms = rooms.filter((r) => r.event_id === eventId);
    const evTickets = tickets.filter((t) => t.event_id === eventId);

    const minFlight = evFlights.length > 0 ? Math.min(...evFlights.map((f) => Number(f.price_customer) || Infinity)) : 0;
    const minRoom = evRooms.length > 0 ? Math.min(...evRooms.map((r) => Number(r.price_customer) || Infinity)) : 0;
    const minTicket = evTickets.length > 0 ? Math.min(...evTickets.map((t) => Number(t.price_customer) || Infinity)) : 0;
    const minTotal =
      (minFlight === Infinity ? 0 : minFlight) +
      (minRoom === Infinity ? 0 : minRoom) +
      (minTicket === Infinity ? 0 : minTicket);

    return {
      flights: evFlights,
      rooms: evRooms,
      tickets: evTickets,
      minTotal,
      currency: evFlights[0]?.currency || evRooms[0]?.currency || evTickets[0]?.currency || "ILS",
    };
  }

  const upcomingEvents = events.filter((e) => !e.end_date || e.end_date.split("T")[0] >= today);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-primary-900">חבילות נסיעה</h2>
          <p className="text-sm text-gray-500 mt-1">חבילה נוצרת אוטומטית לכל אירוע - ריכוז של כל הטיסות, מלונות וכרטיסים</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-2">
            <div className="text-xs text-primary-600">סה״כ הזמנות</div>
            <div className="text-xl font-bold text-primary-800">{Object.values(orderCounts).reduce((a, b) => a + b, 0)}</div>
          </div>
          <Link href="/orders" className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800">
            📋 הצג כל ההזמנות
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-12 text-gray-400">טוען...</div>
      ) : upcomingEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-lg font-medium text-gray-500">אין אירועים פעילים</p>
          <p className="text-sm mt-1">צור אירוע עם טיסות/מלונות/כרטיסים כדי ליצור חבילות</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">אירוע</th>
                  <th className="text-right px-4 py-3 font-medium">יעד</th>
                  <th className="text-right px-4 py-3 font-medium">תאריכים</th>
                  <th className="text-right px-4 py-3 font-medium">✈️ טיסות</th>
                  <th className="text-right px-4 py-3 font-medium">🏨 חדרים</th>
                  <th className="text-right px-4 py-3 font-medium">🎫 כרטיסים</th>
                  <th className="text-right px-4 py-3 font-medium">📋 הזמנות</th>
                  <th className="text-right px-4 py-3 font-medium">מחיר מ-</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {upcomingEvents.map((ev) => {
                  const res = eventResources(ev.id);
                  const hasAny = res.flights.length > 0 || res.rooms.length > 0 || res.tickets.length > 0;
                  return (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{ev.name}</div>
                        <div className="font-mono text-xs text-gray-400">{ev.id}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ev.destination_country || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {ev.start_date ? new Date(ev.start_date).toLocaleDateString("he-IL") : "—"}
                        {ev.end_date && <span className="mx-1">←</span>}
                        {ev.end_date && new Date(ev.end_date).toLocaleDateString("he-IL")}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium text-center">{res.flights.length}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium text-center">{res.rooms.length}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium text-center">{res.tickets.length}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-primary-50 text-primary-700 font-bold px-2 py-1 rounded-full text-xs">
                          {orderCounts[ev.id] || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {res.minTotal > 0 ? (
                          <span className="text-primary-700 font-bold">
                            {currencySymbol(res.currency)}{res.minTotal.toLocaleString("he-IL")}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {hasAny ? (
                            <>
                              <a
                                href={`/book/${ev.share_token || ev.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-primary-700 text-white px-3 py-1 rounded font-medium hover:bg-primary-800"
                              >
                                🛒 בצע הזמנה
                              </a>
                              <a
                                href={`/book/${ev.share_token || ev.id}?preview=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs border border-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-50"
                              >
                                👁️ תצוגה
                              </a>
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/book/${ev.share_token || ev.id}`;
                                  navigator.clipboard.writeText(url);
                                  alert("הקישור הועתק!\n\n" + url);
                                }}
                                className="text-xs border border-green-300 text-green-700 px-3 py-1 rounded hover:bg-green-50"
                              >
                                📢 העתק
                              </button>
                              <Link
                                href={`/orders?event=${ev.id}`}
                                className="text-xs border border-primary-300 text-primary-700 px-3 py-1 rounded hover:bg-primary-50"
                              >
                                📋 הצג הזמנות
                              </Link>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">אין שירותים זמינים</span>
                          )}
                        </div>
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
