"use client";

import { useState, useEffect } from "react";

interface Coupon {
  id: string;
  event_id: string | null;
  event_name: string | null;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  applies_to: string;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface EventOption {
  id: string;
  event_id: string;
  name: string;
}

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  percentage: "אחוז",
  fixed: "סכום קבוע",
};

const APPLIES_TO_LABELS: Record<string, string> = {
  order: "הזמנה",
  item: "פריט",
  shipping: "משלוח",
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    applies_to: "order",
    event_id: "",
    max_uses: "",
    expires_at: "",
  });

  useEffect(() => {
    fetchCoupons();
    fetchEvents();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : data.events || []);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          applies_to: form.applies_to,
          event_id: form.event_id || null,
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          expires_at: form.expires_at || null,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setForm({
          code: "",
          discount_type: "percentage",
          discount_value: "",
          applies_to: "order",
          event_id: "",
          max_uses: "",
          expires_at: "",
        });
        fetchCoupons();
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה ביצירת קופון");
      }
    } catch {
      alert("שגיאה ביצירת קופון");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });
      if (res.ok) {
        fetchCoupons();
      }
    } catch {
      alert("שגיאה בעדכון");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}%`;
    }
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
    }).format(coupon.discount_value);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary-900">ניהול קופונים</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          + קופון חדש
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">קופון חדש</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  קוד קופון <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="SUMMER2026"
                  className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סוג הנחה <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.discount_type}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      discount_type: e.target.value as "percentage" | "fixed",
                    }))
                  }
                  className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="percentage">אחוז</option>
                  <option value="fixed">סכום קבוע</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ערך הנחה <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, discount_value: e.target.value }))
                  }
                  placeholder={form.discount_type === "percentage" ? "10" : "50"}
                  className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">חל על</label>
                <select
                  value={form.applies_to}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, applies_to: e.target.value }))
                  }
                  className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="order">הזמנה</option>
                  <option value="item">פריט</option>
                  <option value="shipping">משלוח</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">אירוע</label>
                <select
                  value={form.event_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, event_id: e.target.value }))
                  }
                  className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">כל האירועים</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מקסימום שימושים
                </label>
                <input
                  type="number"
                  value={form.max_uses}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, max_uses: e.target.value }))
                  }
                  placeholder="ללא הגבלה"
                  className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תאריך תפוגה
                </label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, expires_at: e.target.value }))
                  }
                  className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? "יוצר..." : "צור קופון"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">קוד</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">סוג הנחה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">ערך</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">חל על</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">שימושים</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">תפוגה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    טוען...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    אין קופונים
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-primary-700">
                        {coupon.code}
                      </span>
                      {coupon.event_name && (
                        <div className="text-xs text-gray-400">{coupon.event_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {DISCOUNT_TYPE_LABELS[coupon.discount_type] || coupon.discount_type}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatDiscount(coupon)}</td>
                    <td className="px-4 py-3">
                      {APPLIES_TO_LABELS[coupon.applies_to] || coupon.applies_to}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600">
                        {coupon.used_count || 0}
                        {coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(coupon.expires_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          coupon.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {coupon.is_active ? "פעיל" : "לא פעיל"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        className={`text-xs font-medium ${
                          coupon.is_active
                            ? "text-red-600 hover:text-red-800"
                            : "text-green-600 hover:text-green-800"
                        }`}
                      >
                        {coupon.is_active ? "השבת" : "הפעל"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
