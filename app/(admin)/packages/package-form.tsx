"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface PackageFormProps {
  events: { id: string; name: string }[];
  flights: { id: string; flight_code: string; airline_name: string; event_id: string; origin_city: string; dest_city: string; price_customer?: number; price_company?: number; currency?: string }[];
  rooms: { id: string; room_type: string; event_id: string; hotel_id: string; hotels: { name: string } | null; price_customer?: number; price_company?: number; capacity?: number; currency?: string }[];
  tickets: { id: string; name: string; event_id: string; price_customer?: number; price_company?: number; currency?: string }[];
}

function currencySymbol(c?: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

export default function PackageForm({ events, flights, rooms, tickets }: PackageFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    event_id: "",
    name: "",
    description: "",
    flight_id: "",
    room_id: "",
    ticket_id: "",
    price_total: "",
    service_level: "",
  });

  // Filter related items by selected event
  const filteredFlights = useMemo(
    () => (form.event_id ? flights.filter((f) => f.event_id === form.event_id) : flights),
    [form.event_id, flights]
  );

  const filteredRooms = useMemo(
    () => (form.event_id ? rooms.filter((r) => r.event_id === form.event_id) : rooms),
    [form.event_id, rooms]
  );

  const filteredTickets = useMemo(
    () => (form.event_id ? tickets.filter((t) => t.event_id === form.event_id) : tickets),
    [form.event_id, tickets]
  );

  // Calculate price per person
  const priceBreakdown = useMemo(() => {
    const flight = flights.find((f) => f.id === form.flight_id);
    const room = rooms.find((r) => r.id === form.room_id);
    const ticket = tickets.find((t) => t.id === form.ticket_id);

    // Flight: price per person (already per seat)
    const flightPrice = flight?.price_customer || 0;
    const flightCost = flight?.price_company || 0;

    // Room: price per person (already stored per person per spec)
    const roomPrice = room?.price_customer || 0;
    const roomCost = room?.price_company || 0;

    // Ticket: price per ticket (1 per person)
    const ticketPrice = ticket?.price_customer || 0;
    const ticketCost = ticket?.price_company || 0;

    const totalPrice = flightPrice + roomPrice + ticketPrice;
    const totalCost = flightCost + roomCost + ticketCost;
    const profit = totalPrice - totalCost;
    const currency = flight?.currency || room?.currency || ticket?.currency || "ILS";

    return {
      flightPrice, flightCost,
      roomPrice, roomCost,
      ticketPrice, ticketCost,
      totalPrice, totalCost, profit,
      currency,
      hasAny: !!(flight || room || ticket),
    };
  }, [form.flight_id, form.room_id, form.ticket_id, flights, rooms, tickets]);

  // Auto-update total price when selections change
  useMemo(() => {
    if (priceBreakdown.hasAny && !form.price_total) {
      setForm((prev) => ({ ...prev, price_total: priceBreakdown.totalPrice.toString() }));
    }
  }, [priceBreakdown.totalPrice, priceBreakdown.hasAny, form.price_total]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Reset selections when event changes
      if (name === "event_id") {
        next.flight_id = "";
        next.room_id = "";
        next.ticket_id = "";
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        flight_id: form.flight_id || null,
        room_id: form.room_id || null,
        ticket_id: form.ticket_id || null,
        price_total: form.price_total ? Number(form.price_total) : null,
      };

      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירה");
      }

      router.push("/packages");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">אירוע</label>
          <select
            name="event_id"
            value={form.event_id}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          >
            <option value="">בחר אירוע</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.id})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">שם החבילה</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">טיסה</label>
          <select
            name="flight_id"
            value={form.flight_id}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          >
            <option value="">ללא טיסה</option>
            {filteredFlights.map((f) => (
              <option key={f.id} value={f.id}>
                {f.airline_name} {f.flight_code} ({f.origin_city} → {f.dest_city})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">חדר</label>
          <select
            name="room_id"
            value={form.room_id}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          >
            <option value="">ללא חדר</option>
            {filteredRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.hotels?.name || "מלון"} - {r.room_type}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">כרטיס</label>
          <select
            name="ticket_id"
            value={form.ticket_id}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          >
            <option value="">ללא כרטיס</option>
            {filteredTickets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מחיר כולל לאדם ({currencySymbol(priceBreakdown.currency)})
          </label>
          <input
            type="number"
            name="price_total"
            value={form.price_total}
            onChange={handleChange}
            min={0}
            step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">💡 המחיר הוא לאדם אחד (מקום בטיסה + מקום בחדר + כרטיס אחד)</p>
        </div>
      </div>

      {/* Price Breakdown per Person */}
      {priceBreakdown.hasAny && (
        <div className="mt-5 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <h4 className="text-sm font-semibold text-primary-900 mb-3">💰 חישוב מחיר לאדם אחד</h4>
          <div className="space-y-2 text-sm">
            {priceBreakdown.flightPrice > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">✈️ מקום בטיסה:</span>
                <span className="font-medium text-gray-800">
                  {currencySymbol(priceBreakdown.currency)}{priceBreakdown.flightPrice}
                  <span className="text-xs text-gray-400 mr-2">(עלות: {currencySymbol(priceBreakdown.currency)}{priceBreakdown.flightCost})</span>
                </span>
              </div>
            )}
            {priceBreakdown.roomPrice > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">🏨 חלק בחדר (לאדם):</span>
                <span className="font-medium text-gray-800">
                  {currencySymbol(priceBreakdown.currency)}{priceBreakdown.roomPrice}
                  <span className="text-xs text-gray-400 mr-2">(עלות: {currencySymbol(priceBreakdown.currency)}{priceBreakdown.roomCost})</span>
                </span>
              </div>
            )}
            {priceBreakdown.ticketPrice > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">🎫 כרטיס:</span>
                <span className="font-medium text-gray-800">
                  {currencySymbol(priceBreakdown.currency)}{priceBreakdown.ticketPrice}
                  <span className="text-xs text-gray-400 mr-2">(עלות: {currencySymbol(priceBreakdown.currency)}{priceBreakdown.ticketCost})</span>
                </span>
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-primary-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">סה״כ מחיר לצרכן:</span>
                <span className="font-bold text-primary-900 text-base">{currencySymbol(priceBreakdown.currency)}{priceBreakdown.totalPrice}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs">סה״כ עלות:</span>
                <span className="text-gray-600 text-xs">{currencySymbol(priceBreakdown.currency)}{priceBreakdown.totalCost}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 text-sm">רווח לאדם:</span>
                <span className={`font-bold text-sm ${priceBreakdown.profit > 0 ? "text-green-600" : priceBreakdown.profit < 0 ? "text-red-600" : "text-gray-400"}`}>
                  {currencySymbol(priceBreakdown.currency)}{priceBreakdown.profit}
                  {priceBreakdown.totalCost > 0 && (
                    <span className="mr-1">({((priceBreakdown.profit / priceBreakdown.totalCost) * 100).toFixed(0)}%)</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50"
        >
          {loading ? "שומר..." : "יצירת חבילה"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/packages")}
          className="text-gray-500 hover:text-gray-700 px-4 py-2.5 text-sm font-medium"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
