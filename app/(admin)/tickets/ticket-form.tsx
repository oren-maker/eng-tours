"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TicketFormProps {
  events: { id: string; name: string }[];
  ticket?: Record<string, unknown>;
}

export default function TicketForm({ events, ticket }: TicketFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    event_id: (ticket?.event_id as string) || "",
    name: (ticket?.name as string) || "",
    payment_type: (ticket?.payment_type as string) || "credit",
    price_customer: (ticket?.price_customer as number) || "",
    price_company: (ticket?.price_company as number) || "",
    total_qty: (ticket?.total_qty as number) || "",
    external_url: (ticket?.external_url as string) || "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        price_customer: form.price_customer ? Number(form.price_customer) : null,
        price_company: form.price_company ? Number(form.price_company) : null,
        total_qty: form.total_qty ? Number(form.total_qty) : null,
      };

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירה");
      }

      router.push("/tickets");
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
          <label className="block text-sm font-medium text-gray-700 mb-1">שם הכרטיס</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סוג תשלום</label>
          <select
            name="payment_type"
            value={form.payment_type}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          >
            <option value="credit">אשראי</option>
            <option value="cash">מזומן</option>
            <option value="transfer">העברה</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מחיר ללקוח ($)</label>
          <input
            type="number"
            name="price_customer"
            value={form.price_customer}
            onChange={handleChange}
            min={0}
            step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">מחיר לחברה ($)</label>
          <input
            type="number"
            name="price_company"
            value={form.price_company}
            onChange={handleChange}
            min={0}
            step="0.01"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">כמות כוללת</label>
          <input
            type="number"
            name="total_qty"
            value={form.total_qty}
            onChange={handleChange}
            min={0}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">קישור חיצוני</label>
          <input
            type="url"
            name="external_url"
            value={form.external_url}
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
          {loading ? "שומר..." : "הוספת כרטיס"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/tickets")}
          className="text-gray-500 hover:text-gray-700 px-4 py-2.5 text-sm font-medium"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
