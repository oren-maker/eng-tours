"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function currencySymbol(c?: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

export default function PackagesPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/flights").then((r) => r.json()),
      fetch("/api/rooms").then((r) => r.json()),
      fetch("/api/tickets").then((r) => r.json()),
    ])
      .then(([eventsData, flightsData, roomsData, ticketsData]) => {
        if (Array.isArray(eventsData)) setEvents(eventsData.filter((e: any) => e.status === "active"));
        if (Array.isArray(flightsData)) setFlights(flightsData);
        if (Array.isArray(roomsData)) setRooms(roomsData);
        if (Array.isArray(ticketsData)) setTickets(ticketsData);
      })
      .finally(() => setLoading(false));
  }, []);

  function eventResources(eventId: string) {
    const evFlights = flights.filter((f) => f.event_id === eventId);
    const evRooms = rooms.filter((r) => r.event_id === eventId);
    const evTickets = tickets.filter((t) => t.event_id === eventId);

    const minFlight = evFlights.length > 0 ? Math.min(...evFlights.map((f) => f.price_customer || Infinity)) : 0;
    const minRoom = evRooms.length > 0 ? Math.min(...evRooms.map((r) => r.price_customer || Infinity)) : 0;
    const minTicket = evTickets.length > 0 ? Math.min(...evTickets.map((t) => t.price_customer || Infinity)) : 0;
    const minTotal = (minFlight === Infinity ? 0 : minFlight) + (minRoom === Infinity ? 0 : minRoom) + (minTicket === Infinity ? 0 : minTicket);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary-900">חבילות נסיעה</h2>
          <p className="text-sm text-gray-500 mt-1">חבילה נוצרת אוטומטית לכל אירוע - ריכוז של כל הטיסות, מלונות וכרטיסים</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : upcomingEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-lg font-medium text-gray-500">אין אירועים פעילים</p>
          <p className="text-sm mt-1">צור אירוע עם טיסות/מלונות/כרטיסים כדי ליצור חבילות</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingEvents.map((ev) => {
            const res = eventResources(ev.id);
            const hasAny = res.flights.length > 0 || res.rooms.length > 0 || res.tickets.length > 0;
            return (
              <div key={ev.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-l from-primary-700 to-primary-500 text-white p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{ev.name}</h3>
                      {ev.destination_country && <p className="text-sm text-white/80 mt-0.5">📍 {ev.destination_country}</p>}
                    </div>
                    <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-mono">{ev.id}</span>
                  </div>
                  {ev.start_date && (
                    <p className="text-xs text-white/70 mt-2">
                      📅 {new Date(ev.start_date).toLocaleDateString("he-IL")}
                      {ev.end_date && ` ← ${new Date(ev.end_date).toLocaleDateString("he-IL")}`}
                    </p>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">✈️ טיסות זמינות</span>
                    <span className="font-semibold text-gray-800">{res.flights.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">🏨 חדרים זמינים</span>
                    <span className="font-semibold text-gray-800">{res.rooms.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">🎫 כרטיסים זמינים</span>
                    <span className="font-semibold text-gray-800">{res.tickets.length}</span>
                  </div>

                  {res.minTotal > 0 && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-gray-500">מחיר החל מ-</span>
                        <span className="text-2xl font-bold text-primary-700">
                          {currencySymbol(res.currency)}{res.minTotal.toLocaleString("he-IL")}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 text-left">לאדם</p>
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5">
                  <Link
                    href={`/packages/wizard/${ev.id}`}
                    className={`block w-full text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      hasAny
                        ? "bg-primary-700 text-white hover:bg-primary-800"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                    }`}
                  >
                    {hasAny ? "🛒 הזמן חבילה" : "אין שירותים זמינים"}
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
