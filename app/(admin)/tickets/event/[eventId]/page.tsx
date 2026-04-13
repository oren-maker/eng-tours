"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function currencySymbol(c?: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

const currencyOptions = [
  { value: "ILS", label: "₪ שקל" },
  { value: "USD", label: "$ דולר" },
  { value: "EUR", label: "€ יורו" },
];

export default function EventTicketsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "", price_customer: "", price_company: "",
    currency: "ILS", total_qty: "", external_url: "",
  });

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch(`/api/events/${eventId}`).then((r) => r.json()),
      fetch(`/api/tickets`).then((r) => r.json()),
    ])
      .then(([evData, tkData]) => {
        setEvent(evData);
        if (Array.isArray(tkData)) setTickets(tkData.filter((t: any) => t.event_id === eventId));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [eventId]);

  function openAddForm() {
    setEditingTicket(null);
    setForm({ name: "", price_customer: "", price_company: "", currency: "ILS", total_qty: "", external_url: "" });
    setShowForm(true);
  }

  function openEditForm(t: any) {
    setEditingTicket(t);
    setForm({
      name: t.name || "",
      price_customer: t.price_customer?.toString() || "",
      price_company: t.price_company?.toString() || "",
      currency: t.currency || "ILS",
      total_qty: t.total_qty?.toString() || "",
      external_url: t.external_url || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      event_id: eventId,
      name: form.name,
      price_customer: form.price_customer ? Number(form.price_customer) : null,
      price_company: form.price_company ? Number(form.price_company) : null,
      currency: form.currency,
      total_qty: form.total_qty ? Number(form.total_qty) : null,
      external_url: form.external_url || null,
    };

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowForm(false);
      loadData();
    } else {
      const d = await res.json();
      alert(d.error || "שגיאה");
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!event || event.error) return <div className="text-center text-red-500 py-12">אירוע לא נמצא</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <Link href="/tickets" className="text-sm text-gray-500 hover:text-primary-700">← חזרה לאירועים</Link>
          <h2 className="text-2xl font-bold text-primary-900 mt-2">🎫 כרטיסים - {event.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {event.destination_country && `📍 ${event.destination_country}`}
            {event.start_date && ` · 📅 ${new Date(event.start_date).toLocaleDateString("he-IL")}`}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openAddForm}
            className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800"
          >
            + הוסף סוג כרטיס
          </button>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingTicket ? "עריכת סוג כרטיס" : "סוג כרטיס חדש"}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">שם הכרטיס</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  placeholder="לדוגמה: רגיל, VIP, בק סטייג׳"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">כמות כוללת</label>
                <input type="number" value={form.total_qty} onChange={(e) => setForm({ ...form, total_qty: e.target.value })} min={0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">עלות לחברה ({currencySymbol(form.currency)})</label>
                <div className="flex gap-1">
                  <input type="number" value={form.price_company} onChange={(e) => setForm({ ...form, price_company: e.target.value })} min={0} step="0.01"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-2.5 text-sm focus:border-primary-500 outline-none">
                    {currencyOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מחיר ללקוח ({currencySymbol(form.currency)})</label>
                <input type="number" value={form.price_customer} onChange={(e) => setForm({ ...form, price_customer: e.target.value })} min={0} step="0.01"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">קישור חיצוני (אופציונלי)</label>
                <input type="url" value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} dir="ltr"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
              </div>
            </div>

            {(Number(form.price_customer) > 0 || Number(form.price_company) > 0) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg flex gap-6 text-sm">
                <span className="text-gray-500">רווח לכרטיס: <span className={`font-bold ${(Number(form.price_customer) - Number(form.price_company)) > 0 ? "text-green-600" : "text-red-600"}`}>
                  {currencySymbol(form.currency)}{(Number(form.price_customer) || 0) - (Number(form.price_company) || 0)}
                </span></span>
                {Number(form.price_company) > 0 && (
                  <span className="text-gray-500">אחוז רווח: <span className="font-bold text-primary-700">
                    {Math.round(((Number(form.price_customer) - Number(form.price_company)) / Number(form.price_company)) * 100)}%
                  </span></span>
                )}
              </div>
            )}

            <div className="mt-4">
              <button type="submit" className="bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800">
                {editingTicket ? "עדכן כרטיס" : "הוסף כרטיס"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search bar */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 חפש כרטיס: שם, מחיר..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
        />
      </div>

      {/* Tickets list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {(() => {
          const filtered = tickets.filter((t) => {
            const s = search.trim().toLowerCase();
            if (!s) return true;
            return t.name?.toLowerCase().includes(s) || String(t.price_customer || "").includes(s);
          });
          return (
            <>
        <h3 className="text-lg font-semibold text-gray-800 p-4 border-b border-gray-100">
          סוגי כרטיסים ({filtered.length}{search && ` מתוך ${tickets.length}`})
        </h3>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">{search ? "אין תוצאות" : "אין כרטיסים עדיין"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">שם</th>
                  <th className="text-right px-4 py-3 font-medium">עלות</th>
                  <th className="text-right px-4 py-3 font-medium">מחיר</th>
                  <th className="text-right px-4 py-3 font-medium">רווח</th>
                  <th className="text-right px-4 py-3 font-medium">מלאי</th>
                  <th className="text-right px-4 py-3 font-medium">נמכרו</th>
                  <th className="text-right px-4 py-3 font-medium">מצב</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => {
                  const remaining = (t.total_qty || 0) - (t.booked_qty || 0);
                  const pct = t.total_qty ? Math.round(((t.booked_qty || 0) / t.total_qty) * 100) : 0;
                  const profit = (Number(t.price_customer) || 0) - (Number(t.price_company) || 0);
                  const profitPct = Number(t.price_company) > 0 ? Math.round((profit / Number(t.price_company)) * 100) : null;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                      <td className="px-4 py-3 text-gray-600">{currencySymbol(t.currency)}{t.price_company || 0}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{currencySymbol(t.currency)}{t.price_customer || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "text-gray-400"}`}>
                          {currencySymbol(t.currency)}{profit}
                          {profitPct !== null && <span className="text-xs mr-1">({profitPct}%)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.total_qty || 0}</td>
                      <td className="px-4 py-3 text-gray-600">{t.booked_qty || 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                remaining <= 0 ? "bg-red-500" :
                                pct >= 80 ? "bg-yellow-500" :
                                "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {remaining <= 0 ? "אזל" : `${remaining} נותרו`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEditForm(t)} className="text-primary-700 hover:text-primary-900 text-xs font-medium">
                          ✏️ עריכה
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
