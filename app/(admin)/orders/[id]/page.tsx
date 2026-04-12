"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Participant {
  id: string;
  first_name_en: string;
  last_name_en: string;
  passport_number: string;
  passport_expiry: string;
  birth_date: string;
  age_at_event: number;
  phone: string;
  email: string;
  flight_id: string;
  room_id: string;
  ticket_id: string;
  package_id: string;
  amount_paid: number;
  payment_token: string;
}

interface SupplierConfirmation {
  id: string;
  supplier_id: string;
  item_type: string;
  item_id: string;
  confirmation_number: string;
  notes: string;
  has_issue: boolean;
  created_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
  user_display_name?: string;
}

interface OrderDetail {
  id: string;
  event_id: string;
  event_name?: string;
  share_token: string;
  status: string;
  mode: string;
  total_price: number;
  amount_paid: number;
  internal_notes: string;
  created_at: string;
  confirmed_at: string | null;
  supplier_viewed_at: string | null;
  supplier_approved_at: string | null;
  participants: Participant[];
  supplier_confirmations: SupplierConfirmation[];
  audit_log: AuditEntry[];
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

const STATUS_OPTIONS = [
  { value: "draft", label: "טיוטה" },
  { value: "pending_payment", label: "ממתין לתשלום" },
  { value: "partial", label: "שולם חלקית" },
  { value: "completed", label: "הושלם" },
  { value: "supplier_review", label: "בדיקת ספק" },
  { value: "supplier_approved", label: "ספק אישר" },
  { value: "confirmed", label: "מאושר" },
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Failed to fetch order:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrder();
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה בשינוי סטטוס");
      }
    } catch {
      alert("שגיאה בשינוי סטטוס");
    }
  };

  const handleCancel = async () => {
    if (!confirm("האם אתה בטוח שברצונך לבטל את ההזמנה?")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        fetchOrder();
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה בביטול");
      }
    } catch {
      alert("שגיאה בביטול");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: order?.status,
          internal_notes: order?.internal_notes
            ? `${order.internal_notes}\n---\n${new Date().toLocaleString("he-IL")}: ${newNote}`
            : `${new Date().toLocaleString("he-IL")}: ${newNote}`,
        }),
      });
      if (res.ok) {
        setNewNote("");
        fetchOrder();
      }
    } catch {
      alert("שגיאה בשמירת הערה");
    } finally {
      setSavingNote(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
    }).format(price || 0);
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">טוען הזמנה...</div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">הזמנה לא נמצאה</p>
        <Link href="/orders" className="text-primary-700 hover:underline">
          חזרה להזמנות
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push("/orders")}
            className="text-sm text-primary-700 hover:underline mb-2 block"
          >
            &larr; חזרה להזמנות
          </button>
          <h2 className="text-2xl font-bold text-primary-900">
            הזמנה #{order.id.slice(0, 8)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {order.status !== "cancelled" && (
            <>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleStatusChange(e.target.value);
                }}
                className="text-sm border rounded-lg px-3 py-2 bg-white"
              >
                <option value="">שינוי סטטוס...</option>
                {STATUS_OPTIONS.filter((s) => s.value !== order.status).map(
                  (s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  )
                )}
              </select>
              <button
                onClick={handleCancel}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
              >
                ביטול הזמנה
              </button>
            </>
          )}
        </div>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            פרטי הזמנה
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">מספר הזמנה:</span>
              <span className="font-mono text-xs">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">אירוע:</span>
              <span>{order.event_name || order.event_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">סטטוס:</span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  STATUS_BADGES[order.status] || "bg-gray-100"
                }`}
              >
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">מצב:</span>
              <span>{order.mode === "payment" ? "תשלום" : "רישום"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">סכום כולל:</span>
              <span className="font-bold">
                {formatPrice(order.total_price)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">שולם:</span>
              <span className="text-green-700 font-bold">
                {formatPrice(order.amount_paid)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">נוצר:</span>
              <span>{formatDate(order.created_at)}</span>
            </div>
            {order.confirmed_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">אושר:</span>
                <span>{formatDate(order.confirmed_at)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">טוקן שיתוף:</span>
              <span className="font-mono text-xs">
                {order.share_token?.slice(0, 12)}...
              </span>
            </div>
          </div>
        </div>

        {/* Supplier Confirmations */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            אישורי ספקים
          </h3>
          {order.supplier_confirmations?.length > 0 ? (
            <div className="space-y-3">
              {order.supplier_confirmations.map((conf) => (
                <div
                  key={conf.id}
                  className={`p-3 rounded-lg border text-sm ${
                    conf.has_issue
                      ? "border-red-200 bg-red-50"
                      : "border-green-200 bg-green-50"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">
                      {conf.item_type === "flight"
                        ? "טיסה"
                        : conf.item_type === "room"
                          ? "חדר"
                          : "כרטיס"}
                    </span>
                    <span>
                      {conf.has_issue ? "בעיה" : "אושר"}
                    </span>
                  </div>
                  {conf.confirmation_number && (
                    <div className="text-xs text-gray-500 mt-1">
                      מספר אישור: {conf.confirmation_number}
                    </div>
                  )}
                  {conf.notes && (
                    <div className="text-xs text-gray-500 mt-1">
                      {conf.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              אין אישורי ספקים עדיין
            </p>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          משתתפים ({order.participants?.length || 0})
        </h3>
        {order.participants?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">
                    שם (EN)
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">
                    דרכון
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">
                    תוקף דרכון
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">
                    תאריך לידה
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">
                    גיל
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">
                    טלפון
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">
                    מייל
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">
                    שולם
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.participants.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      {p.first_name_en} {p.last_name_en}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {p.passport_number || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {p.passport_expiry || "-"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {p.birth_date || "-"}
                    </td>
                    <td className="px-3 py-2">{p.age_at_event || "-"}</td>
                    <td className="px-3 py-2 text-xs">{p.phone || "-"}</td>
                    <td className="px-3 py-2 text-xs">{p.email || "-"}</td>
                    <td className="px-3 py-2">
                      {formatPrice(p.amount_paid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">אין משתתפים</p>
        )}
      </div>

      {/* Internal Notes */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          הערות פנימיות
        </h3>
        {order.internal_notes ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 whitespace-pre-wrap text-sm">
            {order.internal_notes}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-4">אין הערות</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="הוסף הערה פנימית..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
          />
          <button
            onClick={handleAddNote}
            disabled={savingNote || !newNote.trim()}
            className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50"
          >
            {savingNote ? "שומר..." : "הוסף"}
          </button>
        </div>
      </div>

      {/* Audit Log / Timeline */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          היסטוריית שינויים
        </h3>
        {order.audit_log?.length > 0 ? (
          <div className="space-y-3">
            {order.audit_log.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 text-sm border-r-2 border-primary-200 pr-4 py-2"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    {entry.action}
                  </div>
                  {entry.after_data &&
                    typeof entry.after_data === "object" &&
                    "status" in entry.after_data && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        סטטוס:{" "}
                        {STATUS_LABELS[
                          entry.before_data?.status as string
                        ] || "?"}{" "}
                        &rarr;{" "}
                        {STATUS_LABELS[
                          entry.after_data.status as string
                        ] || "?"}
                      </div>
                    )}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">
                  {formatDate(entry.created_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">
            אין היסטוריית שינויים
          </p>
        )}
      </div>
    </div>
  );
}
