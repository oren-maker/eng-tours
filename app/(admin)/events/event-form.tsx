"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";

interface EventFormProps {
  event?: {
    id: string;
    name: string;
    description: string;
    type_code: string;
    services: string[];
    start_date: string;
    end_date: string;
    min_age: number | null;
    max_age: number | null;
    mode: string;
    waiting_list_enabled: boolean;
    status: string;
    destination_country: string;
  };
}

const serviceOptions = [
  { value: "flight_international", label: "טיסה לחו\"ל", icon: "✈️" },
  { value: "hotel_international", label: "מלון בחו\"ל", icon: "🏨" },
  { value: "flight_domestic", label: "טיסה בארץ", icon: "🛩️" },
  { value: "hotel_domestic", label: "מלון בארץ", icon: "🏠" },
];

const typeOptions = [
  { value: "RF", label: "מלון בלבד" },
  { value: "FL", label: "טיסות בלבד" },
  { value: "RL", label: "טיסות + מלון בחו\"ל" },
  { value: "IL", label: "מלון בארץ" },
  { value: "FI", label: "מלון + טיסות בארץ" },
];

export default function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: event?.name || "",
    description: event?.description || "",
    type_code: event?.type_code || "RL",
    services: event?.services || [] as string[],
    start_date: event?.start_date || "",
    end_date: event?.end_date || "",
    min_age: event?.min_age ?? "",
    max_age: event?.max_age ?? "",
    mode: event?.mode || "registration",
    waiting_list_enabled: event?.waiting_list_enabled ?? false,
    destination_country: event?.destination_country || "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    if (type === "checkbox" && name === "waiting_list_enabled") {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  function toggleService(service: string) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        min_age: form.min_age ? Number(form.min_age) : null,
        max_age: form.max_age ? Number(form.max_age) : null,
      };

      const url = event ? `/api/events/${event.id}` : "/api/events";
      const method = event ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירה");
      }

      router.push("/events");
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
          <label className="block text-sm font-medium text-gray-700 mb-1">שם האירוע</label>
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
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">מדינת יעד</label>
          <input
            type="text"
            name="destination_country"
            value={form.destination_country}
            onChange={handleChange}
            list="countries-list"
            placeholder="הקלד שם מדינה..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
          <datalist id="countries-list">
            {COUNTRIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        {/* Services - Multi-select checkboxes */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">שירותים כלולים</label>
          <div className="grid grid-cols-2 gap-3">
            {serviceOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleService(opt.value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  form.services.includes(opt.value)
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="text-lg">{opt.icon}</span>
                <span>{opt.label}</span>
                {form.services.includes(opt.value) && (
                  <span className="mr-auto text-primary-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סוג אירוע (קוד)</label>
          <select
            name="type_code"
            value={form.type_code}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מצב</label>
          <select
            name="mode"
            value={form.mode}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          >
            <option value="registration">הרשמה</option>
            <option value="payment">תשלום</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תאריך התחלה</label>
          <input
            type="date"
            name="start_date"
            value={form.start_date}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">תאריך סיום</label>
          <input
            type="date"
            name="end_date"
            value={form.end_date}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">גיל מינימום</label>
          <input
            type="number"
            name="min_age"
            value={form.min_age}
            onChange={handleChange}
            min={0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">גיל מקסימום</label>
          <input
            type="number"
            name="max_age"
            value={form.max_age}
            onChange={handleChange}
            min={0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <input
            type="checkbox"
            name="waiting_list_enabled"
            id="waiting_list_enabled"
            checked={form.waiting_list_enabled}
            onChange={handleChange}
            className="w-4 h-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
          />
          <label htmlFor="waiting_list_enabled" className="text-sm font-medium text-gray-700">
            הפעלת רשימת המתנה
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50"
        >
          {loading ? "שומר..." : event ? "עדכון אירוע" : "יצירת אירוע"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/events")}
          className="text-gray-500 hover:text-gray-700 px-4 py-2.5 text-sm font-medium"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
