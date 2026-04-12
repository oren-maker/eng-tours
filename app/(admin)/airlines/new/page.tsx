"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";

export default function NewAirlinePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", country: "", iata_code: "",
    contact_name: "", contact_phone: "", contact_email: "",
    website: "", notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/airlines", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "שגיאה"); }
      router.push("/airlines");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally { setLoading(false); }
  }

  function update(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">חברת תעופה חדשה</h2>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">שם חברת התעופה *</label>
            <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מדינה</label>
            <input type="text" value={form.country} onChange={(e) => update("country", e.target.value)} list="countries-list"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
            <datalist id="countries-list">
              {COUNTRIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">קוד IATA</label>
            <input type="text" value={form.iata_code} onChange={(e) => update("iata_code", e.target.value.toUpperCase())} maxLength={3} placeholder="LY"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none uppercase" dir="ltr" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">איש קשר</label>
            <input type="text" value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
            <input type="tel" value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} dir="ltr"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מייל</label>
            <input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} dir="ltr"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אתר</label>
            <input type="url" value={form.website} onChange={(e) => update("website", e.target.value)} dir="ltr"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
            <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button type="submit" disabled={loading}
            className="bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50">
            {loading ? "שומר..." : "שמור"}
          </button>
          <button type="button" onClick={() => router.push("/airlines")}
            className="text-gray-500 hover:text-gray-700 px-4 py-2.5 text-sm font-medium">
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
