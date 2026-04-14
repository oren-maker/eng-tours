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
  cancellation_fee_percent?: number;
  cancellation_fee_amount?: number;
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
  const [passportModal, setPassportModal] = useState<any>(null);

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
    if (!newNote.trim() || !order) return;
    setSavingNote(true);
    try {
      const newNotesContent = order.internal_notes
        ? `${order.internal_notes}\n---\n[${new Date().toLocaleString("he-IL")}]: ${newNote}`
        : `[${new Date().toLocaleString("he-IL")}]: ${newNote}`;

      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: order.status,
          internal_notes: newNotesContent,
        }),
      });
      if (res.ok) {
        setNewNote("");
        await fetchOrder();
      } else {
        const data = await res.json();
        alert("שגיאה בשמירת הערה: " + (data.error || "לא ידוע"));
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
      {/* PDF & Send buttons */}
      <div className="flex items-center gap-2 flex-wrap mb-4 bg-white rounded-xl p-3 shadow-sm">
        <span className="text-sm text-gray-600 font-medium">📄 פעולות הזמנה:</span>
        <a href={`/p/${(order as any).share_token || order.id}`} target="_blank" rel="noopener noreferrer"
          className="text-xs bg-primary-700 text-white px-3 py-1.5 rounded hover:bg-primary-800">
          📥 הורד PDF
        </a>
        <button
          onClick={async () => {
            const participants = order.participants || [];
            const emails = participants.map((p: any) => p.email).filter(Boolean);
            const phones = participants.map((p: any) => p.phone).filter(Boolean);
            if (emails.length === 0 && phones.length === 0) { alert("אין פרטי קשר לרוכשים"); return; }
            if (!confirm(`לשלוח את פרטי ההזמנה ל-${emails.length} מיילים ו-${phones.length} טלפונים?`)) return;
            const res = await fetch(`/api/orders/${order.id}/send-to-buyers`, { method: "POST" });
            const d = await res.json();
            alert(d.success ? `נשלח בהצלחה: ${d.sent_email || 0} מיילים, ${d.sent_whatsapp || 0} WhatsApp` : "שגיאה: " + (d.error || "לא ידוע"));
          }}
          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">
          📢 שלח לרוכשים
        </button>
        <button
          onClick={() => {
            const email = prompt("שלח למייל:");
            if (!email) return;
            fetch(`/api/orders/${order.id}/send-email`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            }).then(r => r.json()).then(d => alert(d.success ? "נשלח!" : "שגיאה: " + (d.error || "")));
          }}
          className="text-xs border border-blue-300 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-50">
          📧 שלח למייל
        </button>
        <button
          onClick={() => {
            const phone = prompt("שלח ל-WhatsApp (מספר טלפון):");
            if (!phone) return;
            fetch(`/api/orders/${order.id}/send-whatsapp`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone }),
            }).then(r => r.json()).then(d => alert(d.success ? "נשלח!" : "שגיאה: " + (d.error || "")));
          }}
          className="text-xs border border-green-300 text-green-700 px-3 py-1.5 rounded hover:bg-green-50">
          💬 שלח ב-WhatsApp
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push("/orders")}
            className="text-sm text-primary-700 hover:underline mb-2 block"
          >
            &larr; חזרה להזמנות
          </button>
          <h2 className="text-2xl font-bold text-primary-900 flex items-center gap-2">
            <span>הזמנה #{order.id.slice(0, 8)}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(order.id);
                alert("מספר ההזמנה הועתק: " + order.id);
              }}
              className="text-sm text-gray-400 hover:text-primary-700 p-1 rounded hover:bg-gray-100"
              title="העתק מספר הזמנה מלא"
            >
              📋
            </button>
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
            {(() => {
              const total = Number(order.total_price) || 0;
              const paid = Number(order.amount_paid) || 0;
              const remaining = total - paid;
              if (remaining > 0 && order.status !== "cancelled") {
                return (
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-lg px-3 py-2 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-orange-700 font-semibold">⏰ נותר לתשלום:</span>
                      <span className="text-orange-700 font-bold">
                        {formatPrice(remaining)}
                      </span>
                    </div>
                    <div className="text-xs text-orange-600">
                      ⚠️ יש לגבות {formatPrice(remaining)} לסיום ההזמנה
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            {(() => {
              const pmts = ((order as any).payments || []) as any[];
              if (pmts.length === 0) return null;
              const uniquePayers = new Set(pmts.map((pm) => pm.participant_id || "general"));
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-blue-700">מספר תשלומים:</span>
                    <span className="text-blue-700 font-bold">
                      {pmts.length === 1 ? "💳 תשלום אחד (במכה)" : `📊 ${pmts.length} תשלומים`}
                    </span>
                  </div>
                  {uniquePayers.size > 1 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600">משלמים נפרדים:</span>
                      <span className="text-blue-600 font-semibold">{uniquePayers.size}</span>
                    </div>
                  )}
                </div>
              );
            })()}
            {Number(order.cancellation_fee_amount) > 0 && (
              <div className="flex justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="text-red-700">דמי ביטול ({order.cancellation_fee_percent}%):</span>
                <span className="text-red-700 font-bold">
                  {formatPrice(order.cancellation_fee_amount)}
                </span>
              </div>
            )}
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">אישורי ספקים</h3>
            {(() => {
              const issueCount = (order.supplier_confirmations || []).filter((c: any) => c.has_issue).length;
              if (issueCount > 0) {
                return (
                  <span className="bg-red-100 border border-red-300 text-red-700 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                    🚨 {issueCount} בעיות
                  </span>
                );
              }
              return null;
            })()}
          </div>

          {/* Issues summary at top - BOLD */}
          {(() => {
            const issues = (order.supplier_confirmations || []).filter((c: any) => c.has_issue);
            if (issues.length === 0) return null;
            return (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🚨</span>
                  <h4 className="text-sm font-bold text-red-800">בעיות שדווחו על ידי ספקים:</h4>
                </div>
                <ul className="space-y-2 text-sm">
                  {issues.map((issue: any) => {
                    const icon = issue.item_type === "flight" ? "✈️" : issue.item_type === "room" ? "🏨" : "🎫";
                    const label = issue.item_type === "flight" ? "טיסה" : issue.item_type === "room" ? "חדר" : "כרטיס";
                    return (
                      <li key={issue.id} className="text-red-900">
                        <span className="font-medium">{icon} {label}:</span>{" "}
                        {issue.issue_description || issue.notes || "בעיה דווחה ללא תיאור"}
                        {issue.confirmation_number && (
                          <span className="text-xs text-gray-600 mr-2" dir="ltr">#{issue.confirmation_number}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}

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

      {/* Payments */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          💰 תשלומים ({(order as any).payments?.length || 0})
        </h3>
        {(order as any).payments?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">משלם</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">סכום</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">אמצעי</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">4 ספרות</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">אישור עסקה</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">תאריך</th>
                </tr>
              </thead>
              <tbody>
                {((order as any).payments as any[]).map((pm) => {
                  const payer = order.participants?.find((p: any) => p.id === pm.participant_id) as any;
                  const methodLabels: Record<string, string> = { credit: "💳 אשראי", transfer: "🏦 העברה", cash: "💵 מזומן", check: "📝 צ'ק" };
                  return (
                    <tr key={pm.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{payer ? `${payer.first_name_en} ${payer.last_name_en}` : "— כללי —"}</td>
                      <td className="px-3 py-2 font-semibold">{formatPrice(pm.amount)}</td>
                      <td className="px-3 py-2">{methodLabels[pm.method] || pm.method || "-"}</td>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">{pm.card_last4 ? `**** ${pm.card_last4}` : "-"}</td>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">{pm.confirmation || "-"}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{pm.payment_date ? new Date(pm.payment_date).toLocaleDateString("he-IL") : formatDate(pm.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4 text-sm">אין תשלומים רשומים</p>
        )}
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
                    סוג תעודה
                  </th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">
                    תוקף
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
                  <th className="text-right px-3 py-2 font-medium text-gray-600">
                    אמצעי תשלום
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.participants.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{p.first_name_en} {p.last_name_en}</span>
                        {p.passport_number && (
                          <button onClick={() => setPassportModal(p as any)}
                            className="text-[10px] bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded hover:bg-primary-100 whitespace-nowrap">
                            🛂 הצג מסמך
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {p.passport_number ? (() => {
                        const docLabels: Record<string, string> = { passport: "דרכון", id_card: "ת״ז", drivers_license: "רישיון" };
                        return (
                          <div>
                            <div className="text-[10px] text-gray-500">{docLabels[(p as any).document_type] || "דרכון"}</div>
                            <div className="font-mono">{p.passport_number}</div>
                          </div>
                        );
                      })() : "-"}
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
                    <td className="px-3 py-2 text-xs">
                      {(() => {
                        const pp = p as any;
                        if (Number(pp.amount_paid) <= 0) {
                          const payer = order.participants?.find((x: any) => x.id === pp.payer_participant_id) as any;
                          return payer && payer.id !== pp.id ? (
                            <span className="text-gray-400">משולם ע״י {payer.first_name_en}</span>
                          ) : <span className="text-gray-400">-</span>;
                        }
                        const methodLabels: Record<string, string> = { credit: "💳 אשראי", transfer: "🏦 העברה", cash: "💵 מזומן", check: "📝 צ'ק" };
                        return (
                          <div className="space-y-0.5">
                            <div className="font-medium text-gray-700">{methodLabels[pp.payment_method] || pp.payment_method || "-"}</div>
                            {pp.payment_card_last4 && <div className="text-gray-500" dir="ltr">**** {pp.payment_card_last4}</div>}
                            {pp.payment_confirmation && <div className="text-gray-400 font-mono" dir="ltr">{pp.payment_confirmation}</div>}
                          </div>
                        );
                      })()}
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
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          📝 הערות פנימיות
          {(() => {
            const noteEntries = (order.audit_log || []).filter((a: any) => a.action === "note_added" && a.after_data?.added_note);
            return noteEntries.length > 0 && (
              <span className="text-xs font-normal bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{noteEntries.length}</span>
            );
          })()}
        </h3>

        {(() => {
          const noteEntries = (order.audit_log || [])
            .filter((a: any) => a.action === "note_added" && a.after_data?.added_note)
            .slice()
            .reverse();
          if (noteEntries.length === 0 && !order.internal_notes) {
            return <p className="text-gray-400 text-sm mb-4 text-center py-6">אין הערות עדיין</p>;
          }
          return (
            <div className="space-y-2 mb-4">
              {noteEntries.map((entry: any) => (
                <div key={entry.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center text-sm font-bold text-yellow-800">
                    {(entry.user_display_name || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{entry.user_display_name || "מערכת"}</span>
                      <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">{entry.after_data.added_note}</div>
                  </div>
                </div>
              ))}
              {order.internal_notes && noteEntries.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap text-sm text-gray-700">
                  <div className="text-xs text-gray-500 mb-1">הערות קודמות (ללא תיעוד משתמש):</div>
                  {order.internal_notes}
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex gap-2 border-t border-gray-100 pt-3">
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
            {savingNote ? "שומר..." : "➕ הוסף"}
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
                note_added: "📝 הערה נוספה",
                payment_added: "💰 תשלום נוסף",
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

                      {/* Note added */}
                      {entry.action === "note_added" && afterData?.added_note && (
                        <div className="text-xs mt-1 bg-yellow-50 border border-yellow-200 p-2 rounded whitespace-pre-wrap">
                          {afterData.added_note}
                        </div>
                      )}

                      {/* Payment added */}
                      {entry.action === "payment_added" && afterData && (
                        <div className="text-xs mt-1 bg-green-50 border border-green-100 p-2 rounded space-y-0.5">
                          <div>סכום: <span className="font-bold">₪{Number(afterData.amount).toLocaleString("he-IL")}</span></div>
                          {afterData.method && <div>אמצעי: {afterData.method}</div>}
                          {afterData.card_last4 && <div>כרטיס: **** {afterData.card_last4}</div>}
                          {afterData.confirmation && <div dir="ltr">אישור: {afterData.confirmation}</div>}
                          {afterData.total_paid != null && <div className="text-gray-500">סה״כ שולם: ₪{Number(afterData.total_paid).toLocaleString("he-IL")}</div>}
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

      {passportModal && <PassportModal passenger={passportModal} onClose={() => setPassportModal(null)} />}
    </div>
  );
}

function PassportModal({ passenger, onClose }: { passenger: any; onClose: () => void }) {
  const data = passenger.passport_data?.data || {};
  const docLabels: Record<string, string> = { passport: "דרכון", id_card: "תעודת זהות", drivers_license: "רישיון נהיגה" };
  const docLabel = docLabels[passenger.document_type] || "דרכון";
  const fields: [string, string, any][] = [
    [`מספר ${docLabel}`, "document_number", passenger.passport_number || data.document_number || data.passport_number],
    ["שם משפחה", "surname", data.surname || passenger.last_name_en],
    ["שמות פרטיים", "given_names", data.given_names || passenger.first_name_en],
    ["שם מלא אנגלית", "full_name_en", data.full_name_en],
    ["תאריך לידה", "birth_date", passenger.birth_date || data.birth_date],
    ["תאריך הנפקה", "issue_date", data.issue_date],
    ["תאריך תפוגה", "expiry_date", passenger.passport_expiry || data.expiry_date],
    ["מין", "sex", data.sex],
    ["לאום", "nationality", data.nationality || passenger.passport_data?.issuing_country],
    ["מקום לידה", "place_of_birth", data.place_of_birth],
    ["MRZ שורה 1", "mrz_line_1", data.mrz_line_1],
    ["MRZ שורה 2", "mrz_line_2", data.mrz_line_2],
  ];
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">🛂 פרטי {docLabel} — {passenger.first_name_en} {passenger.last_name_en}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2">×</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-y-auto">
          <div className="p-5 border-b lg:border-b-0 lg:border-l border-gray-200">
            <div className="text-xs font-semibold text-gray-500 mb-2">פירוט</div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {fields.map(([label, key, value]) => (
                  <tr key={key} className={value ? "" : "opacity-50"}>
                    <td className="py-2 bg-gray-50 font-medium text-gray-600 px-2 w-36">{label}</td>
                    <td className="py-2 px-2 font-mono text-xs" dir={typeof value === "string" && /[a-zA-Z0-9]/.test(value[0] || "") ? "ltr" : "auto"}>
                      {value || <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-5 bg-gray-50 flex items-center justify-center">
            {passenger.passport_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={passenger.passport_image_url} alt="passport" className="max-h-[70vh] object-contain rounded-lg shadow-lg" />
            ) : (
              <div className="text-gray-400 text-sm text-center py-12">
                <div className="text-4xl mb-2">📷</div>
                <div>אין צילום</div>
              </div>
            )}
          </div>
        </div>
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
    issue_description: conf.issue_description || "",
    payment_amount: conf.payment_amount != null ? String(conf.payment_amount) : "",
    payment_currency: conf.payment_currency || "ILS",
    payment_method: conf.payment_method || "",
    payment_installments: conf.payment_installments != null ? String(conf.payment_installments) : "1",
    payment_confirmation: conf.payment_confirmation || "",
    payment_date: conf.payment_date || "",
    payment_due_date: conf.payment_due_date || "",
  });

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/supplier-confirmations/${conf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          payment_amount: form.payment_amount ? Number(form.payment_amount) : null,
          payment_installments: form.payment_installments ? Number(form.payment_installments) : null,
          payment_currency: form.payment_currency || null,
          payment_method: form.payment_method || null,
          payment_confirmation: form.payment_confirmation || null,
          payment_date: form.payment_date || null,
          payment_due_date: form.payment_due_date || null,
        }),
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
            <span className="font-medium text-red-600">⚠️ יש בעיה</span>
          </label>
          {form.has_issue && (
            <div>
              <label className="block text-xs text-red-700 mb-0.5 font-medium">תיאור הבעיה</label>
              <textarea value={form.issue_description} onChange={(e) => setForm({ ...form, issue_description: e.target.value })}
                placeholder="תאר את הבעיה..."
                rows={2}
                className="w-full border border-red-200 rounded px-2 py-1 text-xs focus:border-red-500 outline-none resize-none" />
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-primary-200">
            <div className="text-xs font-semibold text-gray-700 mb-1">💰 פרטי תשלום</div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.01" placeholder="סכום" value={form.payment_amount}
                onChange={(e) => setForm({ ...form, payment_amount: e.target.value })}
                dir="ltr" className="border border-gray-200 rounded px-2 py-1 text-xs" />
              <select value={form.payment_currency}
                onChange={(e) => setForm({ ...form, payment_currency: e.target.value })}
                className="border border-gray-200 rounded px-2 py-1 text-xs">
                <option value="ILS">₪ שקל</option>
                <option value="USD">$ דולר</option>
                <option value="EUR">€ אירו</option>
                <option value="GBP">£ פאונד</option>
              </select>
              <select value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="border border-gray-200 rounded px-2 py-1 text-xs">
                <option value="">אמצעי תשלום...</option>
                <option value="credit">כרטיס אשראי</option>
                <option value="transfer">העברה בנקאית</option>
                <option value="cash">מזומן</option>
                <option value="check">צ&apos;ק</option>
              </select>
              <input type="number" min="1" placeholder="תשלומים" value={form.payment_installments}
                onChange={(e) => setForm({ ...form, payment_installments: e.target.value })}
                dir="ltr" className="border border-gray-200 rounded px-2 py-1 text-xs" />
              <input type="text" placeholder="מספר אישור עסקה" value={form.payment_confirmation}
                onChange={(e) => setForm({ ...form, payment_confirmation: e.target.value })}
                dir="ltr" className="border border-gray-200 rounded px-2 py-1 text-xs col-span-2" />
              <div>
                <label className="block text-[10px] text-gray-500">תאריך תשלום</label>
                <input type="date" value={form.payment_date}
                  onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500">תאריך לחיוב</label>
                <input type="date" value={form.payment_due_date}
                  onChange={(e) => setForm({ ...form, payment_due_date: e.target.value })}
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currencySymbol: Record<string, string> = { ILS: "₪", USD: "$", EUR: "€", GBP: "£" };
  const methodLabel: Record<string, string> = { credit: "כרטיס אשראי", transfer: "העברה בנקאית", cash: "מזומן", check: "צ'ק" };
  const hasPayment = conf.payment_amount != null || conf.payment_method || conf.payment_confirmation;

  return (
    <div className={`p-3 rounded-lg border-2 text-sm ${conf.has_issue ? "border-red-400 bg-red-50" : "border-green-200 bg-green-50"}`}>
      <div className="flex justify-between items-center">
        <span className="font-medium">{typeIcon} {typeLabel}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${conf.has_issue ? "text-red-700" : "text-green-700"}`}>
            {conf.has_issue ? "⚠️ יש בעיה" : "✓ אושר"}
          </span>
          <button onClick={() => setEditing(true)} className="text-xs text-primary-700 hover:text-primary-900">✏️ ערוך</button>
          <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">🗑️</button>
        </div>
      </div>

      {/* Issue description - prominent display */}
      {conf.has_issue && (
        <div className="mt-2 bg-red-100 border border-red-300 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">🚨</span>
            <div className="flex-1">
              <div className="text-xs font-bold text-red-800 mb-1">תיאור הבעיה:</div>
              <div className="text-sm text-red-900">
                {conf.issue_description || conf.notes || "הספק סימן שיש בעיה אך לא ציין פרטים"}
              </div>
            </div>
          </div>
        </div>
      )}
      {conf.confirmation_number && (
        <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
          <span className="font-medium">מספר אישור:</span>
          <span dir="ltr" className="font-mono">{conf.confirmation_number}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(conf.confirmation_number);
              alert("מספר האישור הועתק: " + conf.confirmation_number);
            }}
            className="text-gray-400 hover:text-primary-700 p-0.5 rounded hover:bg-white"
            title="העתק מספר אישור"
          >
            📋
          </button>
        </div>
      )}
      {conf.notes && (
        <div className="text-xs text-gray-500 mt-1">{conf.notes}</div>
      )}
      {hasPayment && (
        <div className="mt-2 bg-white/60 border border-gray-200 rounded p-2 text-xs">
          <div className="font-semibold text-gray-700 mb-1">💰 פרטי תשלום</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-gray-600">
            {conf.payment_amount != null && (
              <div>סכום: <span className="font-semibold text-gray-800">{currencySymbol[conf.payment_currency || "ILS"] || ""}{Number(conf.payment_amount).toLocaleString("he-IL")}</span></div>
            )}
            {conf.payment_method && (
              <div>אמצעי: <span className="font-semibold text-gray-800">{methodLabel[conf.payment_method] || conf.payment_method}</span></div>
            )}
            {conf.payment_installments > 1 && (
              <div>תשלומים: <span className="font-semibold text-gray-800">{conf.payment_installments}</span></div>
            )}
            {conf.payment_confirmation && (
              <div>אישור עסקה: <span className="font-mono font-semibold text-gray-800" dir="ltr">{conf.payment_confirmation}</span></div>
            )}
            {conf.payment_date && (
              <div>תאריך תשלום: <span className="font-semibold text-gray-800">{new Date(conf.payment_date).toLocaleDateString("he-IL")}</span></div>
            )}
            {conf.payment_due_date && (
              <div>תאריך לחיוב: <span className="font-semibold text-gray-800">{new Date(conf.payment_due_date).toLocaleDateString("he-IL")}</span></div>
            )}
          </div>
        </div>
      )}
      {conf.created_at && (
        <div className="text-[10px] text-gray-400 mt-1">
          עודכן: {new Date(conf.created_at).toLocaleString("he-IL")}
        </div>
      )}
    </div>
  );
}
