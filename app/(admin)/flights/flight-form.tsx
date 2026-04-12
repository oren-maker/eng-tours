"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/countries";

const currencyOptions = [
  { value: "ILS", label: "₪ שקל" },
  { value: "USD", label: "$ דולר" },
  { value: "EUR", label: "€ יורו" },
];

function currencySymbol(c: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

interface FlightFormProps {
  events: { id: string; name: string; start_date?: string; end_date?: string }[];
  flight?: Record<string, unknown>;
}

export default function FlightForm({ events, flight }: FlightFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    event_id: (flight?.event_id as string) || "",
    airline_name: (flight?.airline_name as string) || "",
    flight_code: (flight?.flight_code as string) || "",
    departure_time: (flight?.departure_time as string) || "",
    arrival_time: (flight?.arrival_time as string) || "",
    origin_city: (flight?.origin_city as string) || "",
    origin_iata: (flight?.origin_iata as string) || "",
    dest_city: (flight?.dest_city as string) || "",
    dest_iata: (flight?.dest_iata as string) || "",
    total_seats: (flight?.total_seats as number) || "",
    price_customer: (flight?.price_customer as number) || "",
    price_company: (flight?.price_company as number) || "",
    transfer_company: (flight?.transfer_company as string) || "",
    contact_name: (flight?.contact_name as string) || "",
    contact_phone: (flight?.contact_phone as string) || "",
    currency: (flight?.currency as string) || "ILS",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-fill dates when event is selected
      if (name === "event_id" && value) {
        const ev = events.find((e) => e.id === value);
        if (ev?.start_date && !prev.departure_time) {
          updated.departure_time = ev.start_date.split("T")[0] + "T08:00";
        }
        if (ev?.end_date && !prev.arrival_time) {
          updated.arrival_time = ev.end_date.split("T")[0] + "T20:00";
        }
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        total_seats: form.total_seats ? Number(form.total_seats) : null,
        price_customer: form.price_customer ? Number(form.price_customer) : null,
        price_company: form.price_company ? Number(form.price_company) : null,
        currency: form.currency || "ILS",
      };

      const res = await fetch("/api/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירה");
      }

      router.push("/flights");
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">חברת תעופה</label>
          <input
            type="text"
            name="airline_name"
            value={form.airline_name}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">קוד טיסה</label>
          <input
            type="text"
            name="flight_code"
            value={form.flight_code}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">עיר מוצא</label>
          <input
            type="text"
            name="origin_city"
            value={form.origin_city}
            onChange={handleChange}
            list="origin-cities-list"
            placeholder="הקלד שם עיר..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
          <datalist id="origin-cities-list">
            {CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">IATA מוצא</label>
          <input
            type="text"
            name="origin_iata"
            value={form.origin_iata}
            onChange={handleChange}
            maxLength={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none uppercase"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">עיר יעד</label>
          <input
            type="text"
            name="dest_city"
            value={form.dest_city}
            onChange={handleChange}
            list="dest-cities-list"
            placeholder="הקלד שם עיר..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
          <datalist id="dest-cities-list">
            {CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">IATA יעד</label>
          <input
            type="text"
            name="dest_iata"
            value={form.dest_iata}
            onChange={handleChange}
            maxLength={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none uppercase"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תאריך ושעת המראה</label>
          <input
            type="datetime-local"
            name="departure_time"
            value={form.departure_time}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תאריך ושעת נחיתה</label>
          <input
            type="datetime-local"
            name="arrival_time"
            value={form.arrival_time}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מספר מקומות</label>
          <input
            type="number"
            name="total_seats"
            value={form.total_seats}
            onChange={handleChange}
            min={0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מחיר ללקוח ({currencySymbol(form.currency)})</label>
          <div className="flex gap-2">
            <input
              type="number"
              name="price_customer"
              value={form.price_customer}
              onChange={handleChange}
              min={0}
              step="0.01"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
            <select name="currency" value={form.currency} onChange={handleChange}
              className="w-24 border border-gray-200 rounded-lg px-2 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none">
              {currencyOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מחיר לחברה ({currencySymbol(form.currency)})</label>
          <div className="flex gap-2">
            <input
              type="number"
              name="price_company"
              value={form.price_company}
              onChange={handleChange}
              min={0}
              step="0.01"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
            <select name="currency" value={form.currency} onChange={handleChange}
              className="w-24 border border-gray-200 rounded-lg px-2 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none">
              {currencyOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">חברת העברות</label>
          <input
            type="text"
            name="transfer_company"
            value={form.transfer_company}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">שם איש קשר</label>
          <input
            type="text"
            name="contact_name"
            value={form.contact_name}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">טלפון איש קשר</label>
          <input
            type="text"
            name="contact_phone"
            value={form.contact_phone}
            onChange={handleChange}
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
          {loading ? "שומר..." : "הוספת טיסה"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/flights")}
          className="text-gray-500 hover:text-gray-700 px-4 py-2.5 text-sm font-medium"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
