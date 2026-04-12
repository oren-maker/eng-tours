"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface PackageFormProps {
  events: { id: string; name: string; event_id: string }[];
  flights: { id: string; flight_code: string; airline: string; event_id: string; origin_city: string; dest_city: string }[];
  rooms: { id: string; room_type: string; event_id: string; hotel_id: string; hotels: { name: string } | null }[];
  tickets: { id: string; name: string; event_id: string; ticket_type: string }[];
}

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
    total_price: "",
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
        total_price: form.total_price ? Number(form.total_price) : null,
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
                {ev.name} ({ev.event_id})
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
                {f.airline} {f.flight_code} ({f.origin_city} → {f.dest_city})
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
                {t.name} {t.ticket_type ? `(${t.ticket_type})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מחיר כולל ($)</label>
          <input
            type="number"
            name="total_price"
            value={form.total_price}
            onChange={handleChange}
            min={0}
            step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>

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
