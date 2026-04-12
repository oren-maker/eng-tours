"use client";

import { useEffect, useState } from "react";
import { CITIES } from "@/lib/countries";

interface Props {
  airlineId: string;
  events: { id: string; name: string; start_date?: string; end_date?: string }[];
  flight?: any;
  onDone: () => void;
}

const currencyOptions = [
  { value: "ILS", label: "₪ שקל" },
  { value: "USD", label: "$ דולר" },
  { value: "EUR", label: "€ יורו" },
];

function currencySymbol(c: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

export default function FlightRowForm({ airlineId, events, flight, onDone }: Props) {
  const isEdit = !!flight;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    event_id: "",
    flight_code: "",
    departure_time: "",
    arrival_time: "",
    origin_city: "",
    origin_iata: "",
    dest_city: "",
    dest_iata: "",
    total_seats: "",
    price_customer: "",
    price_company: "",
    currency: "ILS",
    transfer_company: "",
    contact_name: "",
    contact_phone: "",
  });

  useEffect(() => {
    if (flight) {
      setForm({
        event_id: flight.event_id || "",
        flight_code: flight.flight_code || "",
        departure_time: flight.departure_time ? flight.departure_time.slice(0, 16) : "",
        arrival_time: flight.arrival_time ? flight.arrival_time.slice(0, 16) : "",
        origin_city: flight.origin_city || "",
        origin_iata: flight.origin_iata || "",
        dest_city: flight.dest_city || "",
        dest_iata: flight.dest_iata || "",
        total_seats: flight.total_seats?.toString() || "",
        price_customer: flight.price_customer?.toString() || "",
        price_company: flight.price_company?.toString() || "",
        currency: flight.currency || "ILS",
        transfer_company: flight.transfer_company || "",
        contact_name: flight.contact_name || "",
        contact_phone: flight.contact_phone || "",
      });
    }
  }, [flight]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "event_id" && value && !isEdit) {
        const ev = events.find((e) => e.id === value);
        if (ev?.start_date && !prev.departure_time) updated.departure_time = ev.start_date.split("T")[0] + "T08:00";
        if (ev?.end_date && !prev.arrival_time) updated.arrival_time = ev.end_date.split("T")[0] + "T20:00";
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const payload: any = {
        event_id: form.event_id || null,
        flight_code: form.flight_code,
        departure_time: form.departure_time || null,
        arrival_time: form.arrival_time || null,
        origin_city: form.origin_city || null,
        origin_iata: form.origin_iata || null,
        dest_city: form.dest_city || null,
        dest_iata: form.dest_iata || null,
        total_seats: form.total_seats ? Number(form.total_seats) : null,
        price_customer: form.price_customer ? Number(form.price_customer) : null,
        price_company: form.price_company ? Number(form.price_company) : null,
        currency: form.currency,
        transfer_company: form.transfer_company || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
      };
      if (isEdit) payload.flight_id = flight.id;

      const res = await fetch(`/api/airlines/${airlineId}/flights`, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "שגיאה"); }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">אירוע</label>
          <select name="event_id" value={form.event_id} onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none">
            <option value="">בחר אירוע</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">קוד טיסה</label>
          <input name="flight_code" value={form.flight_code} onChange={handleChange} required placeholder="LY315" dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סה״כ מקומות</label>
          <input type="number" name="total_seats" value={form.total_seats} onChange={handleChange} min={0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">עיר מוצא</label>
          <input name="origin_city" value={form.origin_city} onChange={handleChange} list="cities-list"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">IATA מוצא</label>
          <input name="origin_iata" value={form.origin_iata} onChange={(e) => setForm((p) => ({ ...p, origin_iata: e.target.value.toUpperCase() }))} maxLength={3} placeholder="TLV" dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none uppercase" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">עיר יעד</label>
          <input name="dest_city" value={form.dest_city} onChange={handleChange} list="cities-list"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">IATA יעד</label>
          <input name="dest_iata" value={form.dest_iata} onChange={(e) => setForm((p) => ({ ...p, dest_iata: e.target.value.toUpperCase() }))} maxLength={3} placeholder="LHR" dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none uppercase" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">זמן יציאה</label>
          <input type="datetime-local" name="departure_time" value={form.departure_time} onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">זמן חזרה</label>
          <input type="datetime-local" name="arrival_time" value={form.arrival_time} onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">עלות ({currencySymbol(form.currency)})</label>
          <div className="flex gap-1">
            <input type="number" name="price_company" value={form.price_company} onChange={handleChange} min={0} step="0.01"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
            <select name="currency" value={form.currency} onChange={handleChange}
              className="w-20 border border-gray-200 rounded-lg px-2 py-2.5 text-sm focus:border-primary-500 outline-none">
              {currencyOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מחיר לצרכן ({currencySymbol(form.currency)})</label>
          <input type="number" name="price_customer" value={form.price_customer} onChange={handleChange} min={0} step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">איש קשר</label>
          <input name="contact_name" value={form.contact_name} onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
          <input name="contact_phone" value={form.contact_phone} onChange={handleChange} dir="ltr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
        </div>
      </div>

      <datalist id="cities-list">
        {CITIES.map((c) => <option key={c} value={c} />)}
      </datalist>

      <div className="mt-4">
        <button type="submit" disabled={loading}
          className="bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50">
          {loading ? "שומר..." : isEdit ? "עדכן טיסה" : "הוסף טיסה"}
        </button>
      </div>
    </form>
  );
}
