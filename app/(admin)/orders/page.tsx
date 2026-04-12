"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Order {
  id: string;
  event_id: string;
  event_name?: string;
  status: string;
  total_price: number;
  amount_paid: number;
  created_at: string;
}

interface EventOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "כל הסטטוסים" },
  { value: "draft", label: "טיוטה" },
  { value: "pending_payment", label: "ממתין לתשלום" },
  { value: "partial", label: "שולם חלקית" },
  { value: "completed", label: "הושלם" },
  { value: "supplier_review", label: "בדיקת ספק" },
  { value: "supplier_approved", label: "ספק אישר" },
  { value: "confirmed", label: "מאושר" },
  { value: "cancelled", label: "מבוטל" },
];

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
  const [events, setEvents] = useState<EventOption[]>([]);
  const [filterEvent, setFilterEvent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [statusChanging, setStatusChanging] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEvent) params.set("event_id", filterEvent);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [filterEvent, filterStatus]);

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

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setStatusChanging(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה בשינוי סטטוס");
      }
    } catch {
      alert("שגיאה בשינוי סטטוס");
    } finally {
      setStatusChanging(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm("האם אתה בטוח שברצונך לבטל את ההזמנה?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה בביטול הזמנה");
      }
    } catch {
      alert("שגיאה בביטול הזמנה");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary-900">הזמנות</h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              אירוע
            </label>
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">כל האירועים</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סטטוס
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  מספר הזמנה
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  אירוע
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  סטטוס
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  סכום
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  שולם
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  תאריך
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    טוען...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    לא נמצאו הזמנות
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      {order.event_name || order.event_id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          STATUS_BADGES[order.status] || "bg-gray-100"
                        }`}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {formatPrice(order.total_price)}
                    </td>
                    <td className="px-4 py-3">
                      {formatPrice(order.amount_paid)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-primary-700 hover:text-primary-900 text-xs font-medium"
                        >
                          צפייה
                        </Link>
                        {order.status !== "cancelled" && (
                          <>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleStatusChange(
                                    order.id,
                                    e.target.value
                                  );
                                }
                              }}
                              disabled={statusChanging === order.id}
                              className="text-xs border rounded px-1 py-0.5 bg-white"
                            >
                              <option value="">שינוי סטטוס</option>
                              {STATUS_OPTIONS.filter(
                                (s) =>
                                  s.value &&
                                  s.value !== order.status &&
                                  s.value !== "cancelled"
                              ).map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleCancel(order.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              ביטול
                            </button>
                          </>
                        )}
                      </div>
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
