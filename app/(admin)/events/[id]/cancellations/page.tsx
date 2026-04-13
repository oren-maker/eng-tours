"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  cancelled: "מבוטל",
};

function fmt(n: any) {
  return "₪" + (Number(n) || 0).toLocaleString("he-IL");
}

export default function CancellationsPage() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${id}`).then((r) => r.json()),
      fetch(`/api/orders?event_id=${id}&status=cancelled`).then((r) => r.json()),
    ]).then(([ev, os]) => {
      setEvent(ev);
      setOrders((Array.isArray(os) ? os : []).filter((o) => Number(o.cancellation_fee_amount) > 0));
      setLoading(false);
    });
  }, [id]);

  const totalFees = orders.reduce((s, o) => s + (Number(o.cancellation_fee_amount) || 0), 0);
  const totalRefunded = orders.reduce((s, o) => s + ((Number(o.amount_paid) || 0) - (Number(o.cancellation_fee_amount) || 0)), 0);

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!event || event.error) return <div className="text-center py-12 text-red-500">אירוע לא נמצא</div>;

  return (
    <div>
      <Link href={`/events/${id}/dashboard`} className="text-sm text-primary-700 hover:underline mb-4 inline-block">
        ← חזרה לדשבורד אירוע
      </Link>

      <div className="mb-6 flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-primary-900">💸 דמי ביטול - {event.name}</h2>
          <p className="text-sm text-gray-500 mt-1">פירוט כל ההזמנות המבוטלות עם דמי ביטול</p>
        </div>
        <div className="flex gap-2">
          <a href={`/events/${id}/cancellations/print`} target="_blank" rel="noopener noreferrer"
            className="text-sm bg-primary-700 text-white px-4 py-2 rounded-lg hover:bg-primary-800">
            📥 הורד PDF
          </a>
          <a href={`/api/events/${id}/cancellations/export`}
            className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            📊 ייצא לאקסל
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="text-xs text-orange-700">סה״כ הזמנות מבוטלות</div>
          <div className="text-2xl font-bold text-orange-800">{orders.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-xs text-green-700">סה״כ דמי ביטול שהתקבלו</div>
          <div className="text-2xl font-bold text-green-800">{fmt(totalFees)}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-xs text-blue-700">סה״כ הוחזר ללקוחות</div>
          <div className="text-2xl font-bold text-blue-800">{fmt(Math.max(0, totalRefunded))}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">אין הזמנות מבוטלות עם דמי ביטול</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">מס׳ הזמנה</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">תאריך הזמנה</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">משתתפים</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">סכום הזמנה</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">שולם</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">% דמי ביטול</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">דמי ביטול</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">החזר ללקוח</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => {
                  const paid = Number(o.amount_paid) || 0;
                  const fee = Number(o.cancellation_fee_amount) || 0;
                  const refund = Math.max(0, paid - fee);
                  return (
                    <tr key={o.id} className="hover:bg-orange-50/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link href={`/orders/${o.id}`} className="text-primary-700 hover:underline">
                          #{o.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString("he-IL")}</td>
                      <td className="px-4 py-3 text-xs">
                        {(o.participants || []).slice(0, 3).map((p: any, i: number) => (
                          <div key={i}>{p.first_name_en} {p.last_name_en}</div>
                        ))}
                      </td>
                      <td className="px-4 py-3 font-medium">{fmt(o.total_price)}</td>
                      <td className="px-4 py-3 text-green-700">{fmt(paid)}</td>
                      <td className="px-4 py-3 text-orange-700 font-semibold">{o.cancellation_fee_percent || 0}%</td>
                      <td className="px-4 py-3 font-bold text-orange-700">{fmt(fee)}</td>
                      <td className="px-4 py-3 text-blue-700">{fmt(refund)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/orders/${o.id}`} className="text-xs text-primary-700 hover:underline">
                          פתח →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-orange-50 font-bold">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right text-orange-900">סה״כ</td>
                  <td className="px-4 py-3 text-orange-800 text-base">{fmt(totalFees)}</td>
                  <td className="px-4 py-3 text-blue-800">{fmt(Math.max(0, totalRefunded))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
