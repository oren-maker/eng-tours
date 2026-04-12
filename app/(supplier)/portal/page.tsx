"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Order {
  id: string;
  order_number: string;
  event_name: string;
  event_date: string;
  participant_count: number;
  status: string;
  created_at: string;
}

export default function SupplierPortalPage() {
  useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const res = await fetch("/api/supplier/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || "שגיאה בטעינת הזמנות");
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const map: Record<string, { label: string; classes: string }> = {
      supplier_review: {
        label: "ממתין לאישור",
        classes: "bg-amber-100 text-amber-800",
      },
      confirmed: {
        label: "אושר",
        classes: "bg-green-100 text-green-800",
      },
      issue_reported: {
        label: "דווחה בעיה",
        classes: "bg-red-100 text-red-800",
      },
      pending: {
        label: "בהמתנה",
        classes: "bg-gray-100 text-gray-800",
      },
    };
    const s = map[status] || map.pending;
    return (
      <span
        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${s.classes}`}
      >
        {s.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">ההזמנות שלי</h2>
        <p className="text-sm text-gray-500 mt-1">
          הזמנות הממתינות לאישור ועדכון מספרי אישור
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">&#128230;</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            אין הזמנות ממתינות
          </h3>
          <p className="text-sm text-gray-500">
            כרגע אין הזמנות שדורשות את הטיפול שלך
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <a
              key={order.id}
              href={`/portal/${order.id}`}
              className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border border-gray-100 block"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-gray-400">
                      #{order.order_number}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {order.event_name}
                  </h3>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 mt-1 rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {order.event_date
                    ? new Date(order.event_date).toLocaleDateString("he-IL")
                    : "לא נקבע"}
                </span>
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {order.participant_count} משתתפים
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
