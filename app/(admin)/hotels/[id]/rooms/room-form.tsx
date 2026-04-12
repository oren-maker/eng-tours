"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RoomFormProps {
  hotelId: string;
  events: { id: string; name: string; event_id: string }[];
}

export default function RoomForm({ hotelId, events }: RoomFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    event_id: "",
    room_type: "",
    check_in: "",
    check_out: "",
    price_per_night: "",
    total_price: "",
    capacity: "",
    total_rooms: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        hotel_id: hotelId,
        event_id: form.event_id || null,
        room_type: form.room_type,
        check_in: form.check_in || null,
        check_out: form.check_out || null,
        price_per_night: form.price_per_night ? Number(form.price_per_night) : null,
        total_price: form.total_price ? Number(form.total_price) : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        total_rooms: form.total_rooms ? Number(form.total_rooms) : null,
      };

      const res = await fetch(`/api/hotels/${hotelId}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירה");
      }

      setForm({
        event_id: "",
        room_type: "",
        check_in: "",
        check_out: "",
        price_per_night: "",
        total_price: "",
        capacity: "",
        total_rooms: "",
      });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">אירוע</label>
          <select
            name="event_id"
            value={form.event_id}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          >
            <option value="">בחר אירוע</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סוג חדר</label>
          <input
            type="text"
            name="room_type"
            value={form.room_type}
            onChange={handleChange}
            required
            placeholder="לדוגמה: דאבל, טריפל"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">צ&apos;ק-אין</label>
          <input
            type="date"
            name="check_in"
            value={form.check_in}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">צ&apos;ק-אאוט</label>
          <input
            type="date"
            name="check_out"
            value={form.check_out}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מחיר ללילה ($)</label>
          <input
            type="number"
            name="price_per_night"
            value={form.price_per_night}
            onChange={handleChange}
            min={0}
            step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">קיבולת</label>
          <input
            type="number"
            name="capacity"
            value={form.capacity}
            onChange={handleChange}
            min={1}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סה&quot;כ חדרים</label>
          <input
            type="number"
            name="total_rooms"
            value={form.total_rooms}
            onChange={handleChange}
            min={0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50"
        >
          {loading ? "שומר..." : "הוספת חדר"}
        </button>
      </div>
    </form>
  );
}
