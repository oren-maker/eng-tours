"use client";

import BackToSettings from "@/components/back-to-settings";
import { useState, useEffect, useCallback } from "react";

interface AuditEntry {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ENTITY_LABELS: Record<string, string> = {
  user: "משתמש",
  event: "אירוע",
  order: "הזמנה",
  flight: "טיסה",
  hotel: "מלון",
  ticket: "כרטיס",
  package: "חבילה",
  coupon: "קופון",
  faq: "שאלה נפוצה",
  setting: "הגדרה",
  supplier_confirmation: "אישור ספק",
  participant: "משתתף",
  payment: "תשלום",
  room: "חדר",
};

const ACTION_LABELS: Record<string, string> = {
  create: "🆕 יצירה",
  update: "✏️ עדכון",
  delete: "🗑️ מחיקה",
  create_user: "👤 יצירת משתמש",
  update_user: "✏️ עדכון משתמש",
  delete_user: "🗑️ מחיקת משתמש",
  reset_password: "🔐 איפוס סיסמה",
  login: "🔓 התחברות",
  logout: "🔒 התנתקות",
  order_status_changed: "🔄 שינוי סטטוס הזמנה",
  order_cancelled: "❌ ביטול הזמנה",
  payment_added: "💰 תשלום נוסף",
  note_added: "📝 הערה נוספה",
  supplier_confirm: "✓ אישור ספק",
  supplier_confirm_all: "✓ אישור ספק (כללי)",
  email_sent: "📧 מייל נשלח",
  whatsapp_sent: "💬 WhatsApp נשלח",
  archive: "📦 העברה לארכיון",
  restore: "♻️ שחזור מארכיון",
  duplicate: "📋 שכפול",
};

function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  // Fallback: try to translate prefix
  if (action.startsWith("create_")) return "🆕 יצירה";
  if (action.startsWith("update_")) return "✏️ עדכון";
  if (action.startsWith("delete_")) return "🗑️ מחיקה";
  return action;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filterUser, setFilterUser] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (filterUser) params.set("user_id", filterUser);
      if (filterEntity) params.set("entity_type", filterEntity);
      if (filterDateFrom) params.set("from", filterDateFrom);
      if (filterDateTo) params.set("to", filterDateTo);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filterUser, filterEntity, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const FIELD_LABELS: Record<string, string> = {
    status: "סטטוס", internal_notes: "הערות פנימיות", added_note: "הערה",
    amount: "סכום", method: "אמצעי תשלום", card_last4: "4 ספרות אחרונות",
    confirmation: "מספר אישור", confirmation_number: "מספר אישור",
    payment_date: "תאריך תשלום", total_paid: "סה״כ שולם",
    name: "שם", email: "מייל", phone: "טלפון", role: "תפקיד",
    is_active: "פעיל", display_name: "שם לתצוגה", password: "סיסמה",
    cancellation_fee_percent: "אחוז דמי ביטול", cancellation_fee_amount: "סכום דמי ביטול",
    refund_amount: "סכום החזר", has_issue: "יש בעיה", issue_description: "תיאור הבעיה",
    notes: "הערות", participant_id: "משתתף", recipient: "נמען", template: "תבנית",
    items_count: "מספר פריטים", changes: "שינויים", from: "מ", to: "ל",
  };

  const STATUS_LABELS_LOG: Record<string, string> = {
    draft: "טיוטה", pending_payment: "ממתין לתשלום", partial: "שולם חלקית",
    completed: "הושלם", supplier_review: "בבדיקת ספק", supplier_approved: "אושר ע״י ספק",
    confirmed: "אושר", cancelled: "מבוטל",
  };

  const formatValue = (k: string, v: unknown): string => {
    if (v === null || v === undefined) return "—";
    if (k === "status" && typeof v === "string") return STATUS_LABELS_LOG[v] || v;
    if (k === "is_active") return v ? "כן" : "לא";
    if (typeof v === "boolean") return v ? "כן" : "לא";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  };

  const renderDiff = (before: Record<string, unknown> | null, after: Record<string, unknown> | null) => {
    if (!before && !after) return <span className="text-gray-400">אין נתונים</span>;

    const allKeys = Array.from(new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]));

    return (
      <div className="space-y-1 text-xs">
        {allKeys.map((k) => {
          const beforeVal = before?.[k];
          const afterVal = after?.[k];
          const same = JSON.stringify(beforeVal) === JSON.stringify(afterVal);
          const label = FIELD_LABELS[k] || k;
          return (
            <div key={k} className="grid grid-cols-12 gap-2 items-center bg-white border border-gray-200 rounded p-2">
              <div className="col-span-3 font-semibold text-gray-700">{label}:</div>
              {same ? (
                <div className="col-span-9 text-gray-600">{formatValue(k, afterVal ?? beforeVal)}</div>
              ) : (
                <>
                  {beforeVal !== undefined && (
                    <div className="col-span-4 bg-red-50 text-red-700 px-2 py-1 rounded">{formatValue(k, beforeVal)}</div>
                  )}
                  <div className="col-span-1 text-center text-gray-400">←</div>
                  {afterVal !== undefined && (
                    <div className="col-span-4 bg-green-50 text-green-700 px-2 py-1 rounded">{formatValue(k, afterVal)}</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <BackToSettings />
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">יומן פעולות</h2>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">משתמש</label>
            <input
              type="text"
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
                setPage(1);
              }}
              placeholder="מזהה משתמש"
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סוג ישות</label>
            <select
              value={filterEntity}
              onChange={(e) => {
                setFilterEntity(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">הכל</option>
              {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מתאריך</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => {
                setFilterDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">עד תאריך</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => {
                setFilterDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-8"></th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">תאריך</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">משתמש</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">פעולה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">ישות</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">פרטים</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    טוען...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    אין רשומות ביומן
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <>
                    <tr
                      key={entry.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === entry.id ? null : entry.id)
                      }
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {expandedId === entry.id ? "▼" : "▶"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatDate(entry.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {entry.user_name || entry.user_id?.slice(0, 8) || "-"}
                      </td>
                      <td className="px-4 py-3 font-medium">{actionLabel(entry.action)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-xs">
                          {ENTITY_LABELS[entry.entity_type] || entry.entity_type}
                        </span>
                        {entry.entity_id && (
                          <span className="text-xs text-gray-400 mr-1">
                            {entry.entity_id.slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {entry.ip_address || "-"}
                      </td>
                    </tr>
                    {expandedId === entry.id && (
                      <tr key={`${entry.id}-detail`} className="border-b bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          {renderDiff(entry.before_data, entry.after_data)}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              הקודם
            </button>
            <span className="text-sm text-gray-500">
              עמוד {page} מתוך {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              הבא
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
