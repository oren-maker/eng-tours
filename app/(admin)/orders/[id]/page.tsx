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
    setLoading(true);
    try {
      // Cache-bust to force fresh data
      const res = await fetch(`/api/orders/${orderId}?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order || data);
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
    let fee = 0;

    // Always ask for cancellation fee (user can enter 0)
    const feeInput = prompt(
      "הזן אחוז דמי ביטול (0-100 בקפיצות של 5). הזן 0 לביטול ללא דמי ביטול:",
      "0"
    );
    if (feeInput === null) return; // user cancelled prompt
    const parsed = parseInt(feeInput.replace(/[^0-9]/g, ""), 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      alert("ערך לא תקין. יש להזין מספר בין 0 ל-100 בקפיצות של 5.");
      return;
    }
    // Round to nearest 5
    fee = Math.round(parsed / 5) * 5;

    const total = Number(order?.total_price) || 0;
    const feeAmount = (total * fee) / 100;
    const msg = fee > 0
      ? `דמי ביטול: ${fee}% (₪${feeAmount.toFixed(0)})\nהאם לבטל את ההזמנה?`
      : "לבטל את ההזמנה ללא דמי ביטול?";
    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellation_fee_percent: fee }),
      });
      if (res.ok) {
        const result = await res.json();
        const feeInfo = fee > 0 ? `\n\nדמי ביטול: ₪${(result.fee_amount || 0).toFixed(0)}\nהחזר: ₪${(result.refund_amount || 0).toFixed(0)}` : "";
        alert(`✓ ההזמנה בוטלה${feeInfo}`);
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

  const formatPrice = (price: number | string | null | undefined) => {
    const num = Number(price) || 0;
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
    }).format(num);
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
          <button
            onClick={fetchOrder}
            className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800"
            title="רענן נתונים"
          >
            🔄 רענן
          </button>
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
            <div className="flex justify-between items-center">
              <span className="text-gray-500">טוקן שיתוף:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs">{order.share_token?.slice(0, 12)}...</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(order.share_token || "");
                    alert("הטוקן הועתק!");
                  }}
                  className="text-primary-600 hover:text-primary-800 text-xs px-1.5 py-0.5 rounded hover:bg-primary-50"
                  title="העתק טוקן"
                >
                  📋
                </button>
              </div>
            </div>
          </div>

          {/* Supplier link */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-primary-900 mb-2">🔗 קישור לספקים</h4>
              <p className="text-xs text-gray-600 mb-2">שלח את הקישור לספקים כדי שיוכלו להזין מספרי אישור</p>
              <div className="flex gap-1">
                <input
                  readOnly
                  value={typeof window !== "undefined" ? `${window.location.origin}/supplier/order/${order.share_token}` : ""}
                  className="flex-1 text-xs font-mono bg-white border border-gray-200 rounded px-2 py-1"
                  dir="ltr"
                />
                <a
                  href={`/supplier/order/${order.share_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                  title="פתח בחלון חדש"
                >
                  🔗 פתח
                </a>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/supplier/order/${order.share_token}`;
                    navigator.clipboard.writeText(url);
                    alert("הקישור הועתק!");
                  }}
                  className="bg-primary-700 text-white px-3 py-1 rounded text-xs hover:bg-primary-800"
                >
                  העתק
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Confirmations - editable */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            אישורי ספקים
          </h3>
          {order.supplier_confirmations?.length > 0 ? (
            <div className="space-y-3">
              {order.supplier_confirmations.map((conf) => (
                <SupplierConfirmationEditable
                  key={conf.id}
                  conf={conf}
                  onSaved={fetchOrder}
                />
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

      {/* Audit Log / Timeline - enhanced */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📜 היסטוריית שינויים ({order.audit_log?.length || 0})
        </h3>
        {order.audit_log?.length > 0 ? (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {order.audit_log.map((entry) => {
              const actionLabels: Record<string, string> = {
                create: "🆕 נוצר",
                update: "✏️ עודכן",
                delete: "🗑️ נמחק",
                order_status_changed: "🔄 שינוי סטטוס",
                order_cancelled: "❌ בוטל",
                supplier_confirm_all: "✓ אישור ספק",
                supplier_confirm: "✓ אישור ספק",
                email_sent: "📧 מייל נשלח",
                whatsapp_sent: "💬 WhatsApp נשלח",
              };
              const afterData = entry.after_data as any;
              const beforeData = entry.before_data as any;
              return (
                <div
                  key={entry.id}
                  className="border-r-2 border-primary-200 pr-3 py-2 hover:bg-gray-50 rounded transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 text-sm">
                        {actionLabels[entry.action] || entry.action}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        ע״י: <span className="font-medium">{entry.user_display_name || "אדמין/מערכת"}</span>
                      </div>

                      {/* Status change */}
                      {afterData?.status && beforeData?.status && (
                        <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                          <span className="font-medium">סטטוס:</span>{" "}
                          {STATUS_LABELS[beforeData.status] || beforeData.status} → {STATUS_LABELS[afterData.status] || afterData.status}
                        </div>
                      )}

                      {/* Cancellation details */}
                      {afterData?.cancellation_fee_percent !== undefined && (
                        <div className="text-xs mt-1 bg-red-50 border border-red-100 p-2 rounded">
                          <div>דמי ביטול: <span className="font-bold">{afterData.cancellation_fee_percent}%</span></div>
                          {afterData.refund_amount !== undefined && <div>החזר: ₪{Number(afterData.refund_amount).toFixed(0)}</div>}
                        </div>
                      )}

                      {/* Change diffs */}
                      {afterData?.changes && Array.isArray(afterData.changes) && afterData.changes.length > 0 && (
                        <div className="text-xs mt-1 bg-blue-50 border border-blue-100 p-2 rounded space-y-1">
                          {afterData.changes.map((c: any, idx: number) => (
                            <div key={idx}>
                              {c.type === "flight" ? "✈️" : c.type === "room" ? "🏨" : "🎫"} {c.action === "created" ? "נוצר חדש" : "עודכן"}
                              {c.confirmation_number && <span className="mr-1">· #{c.confirmation_number}</span>}
                              {c.diffs && Object.entries(c.diffs).map(([k, v]: [string, any]) => (
                                <div key={k} className="mr-3 text-gray-500">
                                  {k}: {JSON.stringify(v.from)} → {JSON.stringify(v.to)}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notification details */}
                      {(entry.action === "email_sent" || entry.action === "whatsapp_sent") && afterData && (
                        <div className="text-xs mt-1 bg-green-50 border border-green-100 p-2 rounded">
                          {afterData.recipient && <div>נמען: {afterData.recipient}</div>}
                          {afterData.template && <div>תבנית: {afterData.template}</div>}
                          {afterData.message_id && <div className="text-gray-400">ID: {afterData.message_id}</div>}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
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

// Editable supplier confirmation component
function SupplierConfirmationEditable({ conf, onSaved }: { conf: any; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    confirmation_number: conf.confirmation_number || "",
    notes: conf.notes || "",
    has_issue: !!conf.has_issue,
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/supplier-confirmations/${conf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditing(false);
        onSaved();
      } else {
        const d = await res.json();
        alert(d.error || "שגיאה בשמירה");
      }
    } catch {
      alert("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("למחוק אישור ספק זה?")) return;
    const res = await fetch(`/api/supplier-confirmations/${conf.id}`, { method: "DELETE" });
    if (res.ok) onSaved();
    else alert("שגיאה במחיקה");
  }

  const typeLabel = conf.item_type === "flight" ? "טיסה" : conf.item_type === "room" ? "חדר" : "כרטיס";
  const typeIcon = conf.item_type === "flight" ? "✈️" : conf.item_type === "room" ? "🏨" : "🎫";

  if (editing) {
    return (
      <div className="p-3 rounded-lg border-2 border-primary-300 bg-primary-50">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">{typeIcon} {typeLabel}</span>
          <div className="flex gap-1">
            <button onClick={handleSave} disabled={saving} className="text-xs bg-primary-700 text-white px-3 py-1 rounded hover:bg-primary-800 disabled:opacity-50">
              {saving ? "שומר..." : "💾 שמור"}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2">
              ביטול
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">מספר אישור</label>
            <input type="text" value={form.confirmation_number} onChange={(e) => setForm({ ...form, confirmation_number: e.target.value })}
              className="w-full border border-gray-200 rounded px-2 py-1 text-xs" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">הערות</label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={form.has_issue} onChange={(e) => setForm({ ...form, has_issue: e.target.checked })} />
            <span>יש בעיה</span>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border text-sm ${conf.has_issue ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
      <div className="flex justify-between items-center">
        <span className="font-medium">{typeIcon} {typeLabel}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs">{conf.has_issue ? "⚠️ בעיה" : "✓ אושר"}</span>
          <button onClick={() => setEditing(true)} className="text-xs text-primary-700 hover:text-primary-900">✏️ ערוך</button>
          <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">🗑️</button>
        </div>
      </div>
      {conf.confirmation_number && (
        <div className="text-xs text-gray-600 mt-1">
          <span className="font-medium">מספר אישור:</span> <span dir="ltr">{conf.confirmation_number}</span>
        </div>
      )}
      {conf.notes && (
        <div className="text-xs text-gray-500 mt-1">{conf.notes}</div>
      )}
      {conf.created_at && (
        <div className="text-[10px] text-gray-400 mt-1">
          עודכן: {new Date(conf.created_at).toLocaleString("he-IL")}
        </div>
      )}
    </div>
  );
}
