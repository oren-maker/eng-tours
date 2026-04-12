export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export default async function TicketsPage() {
  const supabase = createServiceClient();
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("*, events(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-900">כרטיסים</h2>
        <Link
          href="/tickets/new"
          className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          + כרטיס חדש
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {error ? (
          <div className="text-center text-red-500 py-12">
            שגיאה בטעינת כרטיסים: {error.message}
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">🎫</div>
            <p className="text-lg font-medium text-gray-500">אין כרטיסים עדיין</p>
            <p className="text-sm mt-1">הוסף כרטיס חדש כדי להתחיל</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">שם הכרטיס</th>
                  <th className="text-right px-4 py-3 font-medium">אירוע</th>
                  <th className="text-right px-4 py-3 font-medium">סוג</th>
                  <th className="text-right px-4 py-3 font-medium">מחיר</th>
                  <th className="text-right px-4 py-3 font-medium">מלאי</th>
                  <th className="text-right px-4 py-3 font-medium">נמכרו</th>
                  <th className="text-right px-4 py-3 font-medium">מצב מלאי</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket) => {
                  const remaining = (ticket.total_qty || 0) - (ticket.booked_qty || 0);
                  const pct = ticket.total_qty
                    ? Math.round(((ticket.booked_qty || 0) / ticket.total_qty) * 100)
                    : 0;
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {ticket.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {(ticket.events as { name: string })?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ticket.payment_type || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        ${ticket.price_customer || 0}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ticket.total_qty || 0}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ticket.booked_qty || 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                remaining <= 0
                                  ? "bg-red-500"
                                  : pct >= 80
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {remaining <= 0 ? "אזל" : `${remaining} נותרו`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="text-primary-700 hover:text-primary-800 text-xs font-medium"
                        >
                          עריכה
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
