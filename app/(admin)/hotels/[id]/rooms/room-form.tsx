"use client";

import { useEffect, useState } from "react";

interface RoomFormProps {
  hotelId: string;
  events: { id: string; name: string; start_date?: string; end_date?: string }[];
  room?: any;
  onDone?: () => void;
}

const roomTypes = [
  { value: "single", label: "סינגל" },
  { value: "double", label: "זוגי / דאבל" },
  { value: "triple", label: "טריפל" },
  { value: "suite", label: "סוויטה" },
  { value: "family", label: "משפחתי" },
];

export default function RoomForm({ hotelId, events, room, onDone }: RoomFormProps) {
  const isEdit = !!room;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    event_id: "",
    room_type: "",
    check_in: "",
    check_out: "",
    price_customer: "",
    price_company: "",
    capacity: "",
    total_rooms: "",
  });

  useEffect(() => {
    if (room) {
      setForm({
        event_id: room.event_id || "",
        room_type: room.room_type || "",
        check_in: room.check_in ? room.check_in.split("T")[0] : "",
        check_out: room.check_out ? room.check_out.split("T")[0] : "",
        price_customer: room.price_customer?.toString() || "",
        price_company: room.price_company?.toString() || "",
        capacity: room.capacity?.toString() || "",
        total_rooms: room.total_rooms?.toString() || "",
      });
    }
  }, [room]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "event_id" && value && !isEdit) {
        const ev = events.find((e) => e.id === value);
        if (ev?.start_date && !prev.check_in) {
          updated.check_in = ev.start_date.split("T")[0];
        }
        if (ev?.end_date && !prev.check_out) {
          updated.check_out = ev.end_date.split("T")[0];
        }
      }
      return updated;
    });
  }

  const profit = (Number(form.price_customer) || 0) - (Number(form.price_company) || 0);
  const profitPct = Number(form.price_company) > 0 ? ((profit / Number(form.price_company)) * 100).toFixed(0) : "—";

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
        price_customer: form.price_customer ? Number(form.price_customer) : null,
        price_company: form.price_company ? Number(form.price_company) : null,
        capacity: form.capacity ? Number(form.capacity) : null,
        total_rooms: form.total_rooms ? Number(form.total_rooms) : null,
      };

      const url = isEdit
        ? `/api/hotels/${hotelId}/rooms`
        : `/api/hotels/${hotelId}/rooms`;
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit ? { ...payload, room_id: room.id } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירה");
      }

      if (onDone) onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">אירוע</label>
          <select name="event_id" value={form.event_id} onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none">
            <option value="">בחר אירוע</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סוג חדר</label>
          <select name="room_type" value={form.room_type} onChange={handleChange} required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none">
            <option value="">בחר סוג</option>
            {roomTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">צ&apos;ק-אין</label>
          <input type="date" name="check_in" value={form.check_in} onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">צ&apos;ק-אאוט</label>
          <input type="date" name="check_out" value={form.check_out} onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">כמות אנשים בחדר</label>
          <input type="number" name="capacity" value={form.capacity} onChange={handleChange} min={1}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">עלות שלנו לאדם (₪)</label>
          <input type="number" name="price_company" value={form.price_company} onChange={handleChange} min={0} step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מחיר לצרכן לאדם (₪)</label>
          <input type="number" name="price_customer" value={form.price_customer} onChange={handleChange} min={0} step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">כמות חדרים</label>
          <input type="number" name="total_rooms" value={form.total_rooms} onChange={handleChange} min={0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
        </div>
      </div>

      {/* Live profit preview */}
      {(Number(form.price_customer) > 0 || Number(form.price_company) > 0) && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg flex gap-6 text-sm">
          <span className="text-gray-500">רווח לאדם: <span className={`font-bold ${profit > 0 ? "text-green-600" : "text-red-600"}`}>₪{profit}</span></span>
          <span className="text-gray-500">אחוז רווח: <span className="font-bold text-primary-700">{profitPct}%</span></span>
        </div>
      )}

      <div className="mt-4">
        <button type="submit" disabled={loading}
          className="bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50">
          {loading ? "שומר..." : isEdit ? "עדכן חדר" : "הוסף חדר"}
        </button>
      </div>
    </form>
  );
}
