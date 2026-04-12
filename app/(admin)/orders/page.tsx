"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Order {
  id: string;
  event_id: string;
  events?: { name: string; end_date?: string };
  status: string;
  total_price: number;
  amount_paid: number;
  created_at: string;
}

interface Waiter {
  id: string;
  event_id: string;
  events?: { name: string };
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  position: number;
  notified_at: string | null;
  created_at: string;
}

const STATUS_BADGES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_payment: "bg-yellow-100 text-yellow-800",
  partial: "bg-orange-100 text-orange-800",
  completed: "bg-blue-100 text-blue-800",
  supplier_review: "bg-purple-100 text-purple-800",
  supplier_approved: "bg-indigo-100 text-indigo-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "טיוטה",
  pending_payment: "ממתין לתשלום",
  partial: "שולם חלקית",
  completed: "הושלם",
  supplier_review: "בדיקת ספק",
  supplier_approved: "ספק אישר",
  confirmed: "מאושר",
  cancelled: "מבוטל",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"active" | "archive">("active");
  const [statusFilter, setStatusFilter] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()),
      fetch("/api/waiting-list").then((r) => r.json()),
    ])
      .then(([ordersData, waitersData]) => {
        if (Array.isArray(ordersData)) setOrders(ordersData);
        if (Array.isArray(waitersData)) setWaiters(waitersData);
      })
      .finally(() => setLoading(false));
  }, []);

  // Split orders by event end_date
  const activeOrders = orders.filter((o) => {
    const endDate = o.events?.end_date;
    return !endDate || endDate.split("T")[0] >= today;
  });
  const archivedOrders = orders.filter((o) => {
    const endDate = o.events?.end_date;
    return endDate && endDate.split("T")[0] < today;
  });

  const filteredOrders = (view === "active" ? activeOrders : archivedOrders).filter(
    (o) => !statusFilter || o.status === statusFilter
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-900">הזמנות</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Orders list (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Toggle active/archive */}
          <div className="bg-white rounded-xl shadow-sm p-2 flex gap-1">
            <button
              onClick={() => setView("active")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === "active" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              הזמנות פעילות ({activeOrders.length})
            </button>
            <button
              onClick={() => setView("archive")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === "archive" ? "bg-gray-700 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              📦 ארכיון ({archivedOrders.length})
            </button>
          </div>

          {/* Status filter */}
          <div className="bg-white rounded-xl shadow-sm p-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
            >
              <option value="">כל הסטטוסים</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Orders list */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                {view === "active" ? "רשימת הזמנות" : "ארכיון הזמנות"}
              </h3>
              <span className="text-sm text-gray-500">{filteredOrders.length} הזמנות</span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">טוען...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm">אין הזמנות להצגה</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-right px-4 py-3 font-medium">מספר</th>
                      <th className="text-right px-4 py-3 font-medium">אירוע</th>
                      <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                      <th className="text-right px-4 py-3 font-medium">סכום</th>
                      <th className="text-right px-4 py-3 font-medium">שולם</th>
                      <th className="text-right px-4 py-3 font-medium">תאריך</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/orders/${order.id}`} className="font-mono text-xs text-primary-600 hover:text-primary-800">
                            #{order.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{order.events?.name || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[order.status]}`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium">₪{order.total_price || 0}</td>
                        <td className="px-4 py-3 text-gray-600">₪{order.amount_paid || 0}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(order.created_at).toLocaleDateString("he-IL")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Waiting list + status (1/3 width) */}
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">סטטוס מהיר</h3>
            <div className="space-y-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const count = orders.filter((o) => o.status === key).length;
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[key]}`}>
                      {label}
                    </span>
                    <span className="text-sm font-bold text-gray-700">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Waiting list */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-800">⏳ רשימת המתנה</h3>
              <Link href="/waiting-list" className="text-xs text-primary-600 hover:text-primary-800">
                ניהול מלא
              </Link>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">טוען...</div>
            ) : waiters.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-xs">אין אנשים ברשימת המתנה</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {waiters.slice(0, 10).map((w) => (
                  <div key={w.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{w.name}</p>
                        <p className="text-xs text-gray-500 truncate">{w.events?.name || "—"}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {w.phone} {w.email && `· ${w.email}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs font-bold">
                          #{w.position || "—"}
                        </span>
                        {w.notified_at ? (
                          <span className="text-[10px] text-green-600">✓ הודעה נשלחה</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">לא יודעה</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {waiters.length > 10 && (
                  <div className="p-3 text-center">
                    <Link href="/waiting-list" className="text-xs text-primary-600 hover:text-primary-800">
                      + {waiters.length - 10} נוספים
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
