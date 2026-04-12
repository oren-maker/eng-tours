"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  type: "flight" | "room" | "ticket";
  description: string;
  details: string;
  quantity: number;
  confirmation_number: string;
  notes: string;
  has_issue: boolean;
  issue_description: string;
}

interface OrderDetails {
  id: string;
  order_number: string;
  event_name: string;
  event_date: string;
  participant_count: number;
  status: string;
  items: OrderItem[];
}

export default function OrderReviewPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [approving, setApproving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  async function fetchOrder() {
    try {
      setLoading(true);
      const res = await fetch(`/api/supplier/orders?orderId=${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      const data = await res.json();
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || "שגיאה בטעינת ההזמנה");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmItem(itemId: string, confirmationNumber: string, notes: string) {
    try {
      setSubmitting((prev) => ({ ...prev, [itemId]: true }));
      const res = await fetch("/api/supplier/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          itemId,
          confirmation_number: confirmationNumber,
          notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to confirm item");
      await fetchOrder();
      setSuccessMessage("מספר אישור נשמר בהצלחה");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  async function handleReportIssue(itemId: string, issueDescription: string) {
    try {
      setSubmitting((prev) => ({ ...prev, [itemId]: true }));
      const res = await fetch("/api/supplier/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          itemId,
          issue_description: issueDescription,
        }),
      });
      if (!res.ok) throw new Error("Failed to report issue");
      await fetchOrder();
      setSuccessMessage("הבעיה דווחה בהצלחה");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting((prev) => ({ ...prev, [itemId]: false }));
    }
  }

  async function handleApproveAll() {
    try {
      setApproving(true);
      const res = await fetch("/api/supplier/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve");
      }
      setSuccessMessage("ההזמנה אושרה בהצלחה!");
      await fetchOrder();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  }

  const allItemsConfirmed =
    order?.items?.every(
      (item) => item.confirmation_number && !item.has_issue
    ) ?? false;

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
    };
    const s = map[status] || { label: status, classes: "bg-gray-100 text-gray-800" };
    return (
      <span
        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${s.classes}`}
      >
        {s.label}
      </span>
    );
  }

  function getTypeLabel(type: string) {
    const map: Record<string, { label: string; icon: string }> = {
      flight: { label: "טיסה", icon: "&#9992;" },
      room: { label: "חדר", icon: "&#127976;" },
      ticket: { label: "כרטיס", icon: "&#127915;" },
    };
    return map[type] || { label: type, icon: "&#128230;" };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-xl text-center">
        ההזמנה לא נמצאה
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.push("/portal")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4 transition-colors"
      >
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        חזרה לרשימה
      </button>

      {/* Order header */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-gray-400">
                #{order.order_number}
              </span>
              {getStatusBadge(order.status)}
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {order.event_name}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>
            {order.event_date
              ? new Date(order.event_date).toLocaleDateString("he-IL")
              : "לא נקבע"}
          </span>
          <span>{order.participant_count} משתתפים</span>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-4 text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-4 text-sm">
          {error}
          <button
            onClick={() => setError("")}
            className="mr-2 underline text-xs"
          >
            סגור
          </button>
        </div>
      )}

      {/* Items */}
      <div className="space-y-4 mb-8">
        {order.items.map((item) => (
          <OrderItemCard
            key={item.id}
            item={item}
            getTypeLabel={getTypeLabel}
            submitting={submitting[item.id] || false}
            onConfirm={handleConfirmItem}
            onReportIssue={handleReportIssue}
          />
        ))}
      </div>

      {/* Approve all button */}
      {order.status === "supplier_review" && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <button
            onClick={handleApproveAll}
            disabled={!allItemsConfirmed || approving}
            className={`w-full py-3 rounded-xl font-semibold text-base transition-all ${
              allItemsConfirmed && !approving
                ? "bg-green-600 hover:bg-green-700 text-white shadow-sm"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {approving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                מאשר...
              </span>
            ) : (
              "אישור כללי"
            )}
          </button>
          {!allItemsConfirmed && (
            <p className="text-xs text-gray-400 text-center mt-2">
              יש למלא מספר אישור לכל הפריטים ולוודא שאין בעיות פתוחות
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ----- Item Card Component -----

function OrderItemCard({
  item,
  getTypeLabel,
  submitting,
  onConfirm,
  onReportIssue,
}: {
  item: OrderItem;
  getTypeLabel: (type: string) => { label: string; icon: string };
  submitting: boolean;
  onConfirm: (itemId: string, confirmationNumber: string, notes: string) => void;
  onReportIssue: (itemId: string, issueDescription: string) => void;
}) {
  const typeInfo = getTypeLabel(item.type);
  const [confirmationNumber, setConfirmationNumber] = useState(
    item.confirmation_number || ""
  );
  const [notes, setNotes] = useState(item.notes || "");
  const [showIssue, setShowIssue] = useState(item.has_issue || false);
  const [issueDescription, setIssueDescription] = useState(
    item.issue_description || ""
  );

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-5 border ${
        item.has_issue
          ? "border-red-200 bg-red-50/30"
          : item.confirmation_number
          ? "border-green-200 bg-green-50/30"
          : "border-gray-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xl"
          dangerouslySetInnerHTML={{ __html: typeInfo.icon }}
        />
        <span className="font-semibold text-gray-900">{typeInfo.label}</span>
        {item.confirmation_number && (
          <svg
            className="w-5 h-5 text-green-500 mr-auto"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 mb-1">{item.description}</p>
      <p className="text-xs text-gray-500 mb-4">{item.details}</p>
      {item.quantity > 1 && (
        <p className="text-xs text-gray-500 mb-4">כמות: {item.quantity}</p>
      )}

      {/* Confirmation number input */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            מספר אישור
          </label>
          <input
            type="text"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
            placeholder="הזן מספר אישור..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            הערות
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הערות נוספות (אופציונלי)..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onConfirm(item.id, confirmationNumber, notes)}
            disabled={!confirmationNumber.trim() || submitting}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              confirmationNumber.trim() && !submitting
                ? "bg-primary text-white hover:bg-primary-dark"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {submitting ? "שומר..." : "שמור אישור"}
          </button>

          <button
            onClick={() => setShowIssue(!showIssue)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showIssue
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600"
            }`}
          >
            {showIssue ? "ביטול בעיה" : "יש בעיה"}
          </button>
        </div>

        {/* Issue section */}
        {showIssue && (
          <div className="bg-red-50 rounded-lg p-3 space-y-2 border border-red-100">
            <label className="block text-xs font-medium text-red-700">
              תיאור הבעיה
            </label>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="תאר את הבעיה..."
              rows={2}
              className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
            />
            <button
              onClick={() => onReportIssue(item.id, issueDescription)}
              disabled={!issueDescription.trim() || submitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "שולח..." : "דווח בעיה"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
