"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { cachedFetch, invalidateCache } from "@/lib/cached-fetch";

function currencySymbol(c?: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

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
  draft: "טיוטה", pending_payment: "ממתין לתשלום", partial: "שולם חלקית",
  completed: "הושלם", supplier_review: "בדיקת ספק", supplier_approved: "ספק אישר",
  confirmed: "מאושר", cancelled: "מבוטל",
};
const typeLabels: Record<string, string> = {
  RF: "מלון בלבד", FL: "טיסות בלבד", RL: "טיסות + מלון חו\"ל",
  IL: "מלון בארץ", FI: "מלון + טיסות בארץ",
};

export default function EventDashboardPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  function loadData(fresh = false) {
    if (fresh) {
      invalidateCache(`/api/events/${eventId}`);
      invalidateCache("/api/orders");
      invalidateCache(`/api/flights`);
      invalidateCache("/api/rooms");
      invalidateCache("/api/tickets");
      invalidateCache("/api/packages");
    }
    setLoading(true);
    Promise.all([
      cachedFetch<any>(`/api/events/${eventId}`),
      cachedFetch<any>(`/api/orders`),
      cachedFetch<any>(`/api/flights?event_id=${eventId}`),
      cachedFetch<any>(`/api/rooms`),
      cachedFetch<any>(`/api/tickets`),
      cachedFetch<any>(`/api/packages`),
    ])
      .then(([evData, ordersData, flightsData, roomsData, ticketsData, packagesData]) => {
        setEvent(evData);
        if (Array.isArray(ordersData)) setOrders(ordersData.filter((o: any) => o.event_id === eventId));
        if (Array.isArray(flightsData)) setFlights(flightsData);
        if (Array.isArray(roomsData)) setRooms(roomsData.filter((r: any) => r.event_id === eventId));
        if (Array.isArray(ticketsData)) setTickets(ticketsData.filter((t: any) => t.event_id === eventId));
        if (Array.isArray(packagesData)) setPackages(packagesData.filter((p: any) => p.event_id === eventId));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [eventId]);

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!event || event.error) return <div className="text-center text-red-500 py-12">אירוע לא נמצא</div>;

  // Calculate statistics
  const totalOrders = orders.length;
  const confirmedOrders = orders.filter((o) => o.status === "confirmed" || o.status === "completed").length;
  const pendingOrders = orders.filter((o) => o.status === "pending_payment" || o.status === "draft").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

  // Non-cancelled orders = valid orders for revenue/cost calculation
  const validOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "draft");
  const revenue = validOrders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (Number(o.amount_paid) || 0), 0);

  // Flight statistics
  const totalSeats = flights.reduce((sum, f) => sum + (f.total_seats || 0), 0);
  const bookedSeats = flights.reduce((sum, f) => sum + (f.booked_seats || 0), 0);

  // Room statistics
  const totalRooms = rooms.reduce((sum, r) => sum + (r.total_rooms || 0), 0);
  const bookedRooms = rooms.reduce((sum, r) => sum + (r.booked_rooms || 0), 0);

  // Financial calculation - cost proportional to revenue (consistent basis)
  // For each valid order, the cost is based on flights/rooms/tickets allocated
  const avgFlightCost = flights.length > 0
    ? flights.reduce((s, f) => s + (f.price_company || 0), 0) / flights.length
    : 0;
  const avgFlightPrice = flights.length > 0
    ? flights.reduce((s, f) => s + (f.price_customer || 0), 0) / flights.length
    : 0;
  const avgRoomCost = rooms.length > 0
    ? rooms.reduce((s, r) => s + (r.price_company || 0), 0) / rooms.length
    : 0;
  const avgRoomPrice = rooms.length > 0
    ? rooms.reduce((s, r) => s + (r.price_customer || 0), 0) / rooms.length
    : 0;
  const avgTicketCost = tickets.length > 0
    ? tickets.reduce((s, t) => s + (t.price_company || 0), 0) / tickets.length
    : 0;
  const avgTicketPrice = tickets.length > 0
    ? tickets.reduce((s, t) => s + (t.price_customer || 0), 0) / tickets.length
    : 0;

  // Estimate cost ratio (avg cost / avg price) per category, combined
  const avgTotalPrice = avgFlightPrice * 2 + avgRoomPrice + avgTicketPrice; // outbound + return + room + ticket
  const avgTotalCost = avgFlightCost * 2 + avgRoomCost + avgTicketCost;
  const costRatio = avgTotalPrice > 0 ? avgTotalCost / avgTotalPrice : 0.65;

  const totalCost = revenue * costRatio;
  const profit = revenue - totalCost;
  const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/dashboard" className="hover:text-primary-700">דשבורד</Link>
          <span>›</span>
          <span className="text-gray-700">{event.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-primary-900">{event.name}</h2>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                {typeLabels[event.type_code] || event.type_code}
              </span>
              <span className="font-mono text-xs text-gray-500">🆔 {event.id}</span>
            </div>
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              {event.destination_country && <span>📍 {event.destination_country}</span>}
              {event.start_date && <span>📅 {new Date(event.start_date).toLocaleDateString("he-IL")}</span>}
              {event.end_date && <span>← {new Date(event.end_date).toLocaleDateString("he-IL")}</span>}
            </div>
            {event.description && <p className="text-sm text-gray-500 mt-2 max-w-2xl">{event.description}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadData(true)}
              className="border border-primary-300 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
              title="רענן נתונים"
            >
              🔄 רענן
            </button>
            <Link href={`/events/${eventId}`} className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors">
              ✏️ ערוך אירוע
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-primary-500">
          <div className="text-xs text-gray-500 mb-1">סה״כ הכנסות</div>
          <div className="text-2xl font-bold text-gray-800">₪{Math.round(revenue).toLocaleString("he-IL")}</div>
          <div className="text-xs text-gray-400 mt-1">שולם: ₪{totalPaid.toLocaleString("he-IL")}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-green-500">
          <div className="text-xs text-gray-500 mb-1">רווח גולמי משוער</div>
          <div className="text-2xl font-bold text-gray-800">₪{Math.round(profit).toLocaleString("he-IL")}</div>
          <div className="text-xs text-gray-400 mt-1">{profitMargin.toFixed(1)}% רווח</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-yellow-500">
          <div className="text-xs text-gray-500 mb-1">סה״כ הזמנות</div>
          <div className="text-2xl font-bold text-gray-800">{totalOrders}</div>
          <div className="text-xs text-gray-400 mt-1">{confirmedOrders} מאושרות</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-orange-500">
          <div className="text-xs text-gray-500 mb-1">תפוסה</div>
          <div className="text-2xl font-bold text-gray-800">
            {totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0}%
          </div>
          <div className="text-xs text-gray-400 mt-1">{bookedSeats}/{totalSeats} מקומות</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Orders (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">הזמנות האירוע</h3>
              <Link href="/orders" className="text-xs text-primary-600 hover:text-primary-800">כל ההזמנות →</Link>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm">אין הזמנות לאירוע</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-right px-4 py-3 font-medium">מספר</th>
                      <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                      <th className="text-right px-4 py-3 font-medium">סכום</th>
                      <th className="text-right px-4 py-3 font-medium">שולם</th>
                      <th className="text-right px-4 py-3 font-medium">תאריך</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.slice(0, 15).map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/orders/${o.id}`} className="font-mono text-xs text-primary-600 hover:text-primary-800">
                            #{o.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[o.status]}`}>
                            {STATUS_LABELS[o.status] || o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">₪{o.total_price || 0}</td>
                        <td className="px-4 py-3 text-gray-600">₪{o.amount_paid || 0}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(o.created_at).toLocaleDateString("he-IL")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Status Breakdown - clickable */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">פילוח סטטוסים</h3>
              {statusFilter && (
                <button onClick={() => setStatusFilter(null)} className="text-xs text-gray-500 hover:text-primary-700">
                  ✕ נקה סינון
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: "confirmed", label: "מאושרות", count: confirmedOrders, bg: "bg-green-50", bgActive: "bg-green-100 ring-2 ring-green-400", text: "text-green-700", textLabel: "text-green-600" },
                { key: "pending", label: "ממתינות", count: pendingOrders, bg: "bg-yellow-50", bgActive: "bg-yellow-100 ring-2 ring-yellow-400", text: "text-yellow-700", textLabel: "text-yellow-600" },
                { key: "cancelled", label: "מבוטלות", count: cancelledOrders, bg: "bg-red-50", bgActive: "bg-red-100 ring-2 ring-red-400", text: "text-red-700", textLabel: "text-red-600" },
                { key: "other", label: "אחר", count: totalOrders - confirmedOrders - pendingOrders - cancelledOrders, bg: "bg-blue-50", bgActive: "bg-blue-100 ring-2 ring-blue-400", text: "text-blue-700", textLabel: "text-blue-600" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(statusFilter === s.key ? null : s.key)}
                  className={`p-3 rounded-lg text-right transition-all cursor-pointer ${
                    statusFilter === s.key ? s.bgActive : `${s.bg} hover:brightness-95`
                  }`}
                >
                  <div className={`text-2xl font-bold ${s.text}`}>{s.count}</div>
                  <div className={`text-xs ${s.textLabel}`}>{s.label}</div>
                </button>
              ))}
            </div>

            {/* Filtered list */}
            {statusFilter && (() => {
              const filtered = orders.filter((o) => {
                if (statusFilter === "confirmed") return o.status === "confirmed" || o.status === "completed";
                if (statusFilter === "pending") return o.status === "pending_payment" || o.status === "draft";
                if (statusFilter === "cancelled") return o.status === "cancelled";
                if (statusFilter === "other") return !["confirmed", "completed", "pending_payment", "draft", "cancelled"].includes(o.status);
                return false;
              });
              return (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <div className="text-sm text-gray-600 mb-2">{filtered.length} הזמנות:</div>
                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {filtered.length === 0 ? (
                      <p className="text-center text-gray-400 py-4 text-sm">אין הזמנות בסטטוס זה</p>
                    ) : (
                      filtered.map((o) => (
                        <Link
                          key={o.id}
                          href={`/orders/${o.id}`}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm border-r-2 border-gray-200"
                        >
                          <span className="font-mono text-xs text-primary-600">#{o.id.slice(0, 8)}</span>
                          <span className="text-gray-700 text-xs">{STATUS_LABELS[o.status] || o.status}</span>
                          <span className="font-medium text-gray-800">₪{Number(o.total_price || 0).toLocaleString("he-IL")}</span>
                          <span className="text-gray-400 text-xs">{new Date(o.created_at).toLocaleDateString("he-IL")}</span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right: Resources (1/3) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">✈️ טיסות ({flights.length})</h3>
              {flights.length > 5 && (
                <Link href="/airlines" className="text-xs text-primary-600 hover:text-primary-800">הצג הכל →</Link>
              )}
            </div>
            {flights.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">אין טיסות</p>
            ) : (
              <div className="space-y-2">
                {flights.slice(0, 5).map((f) => (
                  <div key={f.id} className="text-sm border-r-2 border-primary-200 pr-3 py-1">
                    <div className="font-medium text-gray-700">{f.airline_name} {f.flight_code}</div>
                    <div className="text-xs text-gray-500">{f.origin_iata} → {f.dest_iata}</div>
                    <div className="text-xs text-gray-400">{f.booked_seats || 0}/{f.total_seats || 0} מקומות</div>
                  </div>
                ))}
                {flights.length > 5 && (
                  <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
                    + עוד {flights.length - 5} טיסות
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">🏨 חדרים ({rooms.length})</h3>
              {rooms.length > 5 && (
                <Link href="/hotels" className="text-xs text-primary-600 hover:text-primary-800">הצג הכל →</Link>
              )}
            </div>
            {rooms.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">אין חדרים</p>
            ) : (
              <div className="space-y-2">
                {rooms.slice(0, 5).map((r) => (
                  <div key={r.id} className="text-sm border-r-2 border-orange-200 pr-3 py-1">
                    <div className="font-medium text-gray-700">{r.hotels?.name || "מלון"}</div>
                    <div className="text-xs text-gray-500">{r.room_type} · {currencySymbol(r.currency)}{r.price_customer}/אדם</div>
                    <div className="text-xs text-gray-400">{r.booked_rooms || 0}/{r.total_rooms || 0} חדרים</div>
                  </div>
                ))}
                {rooms.length > 5 && (
                  <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
                    + עוד {rooms.length - 5} חדרים
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-800">🎫 כרטיסים ({tickets.length})</h3>
              {tickets.length > 5 && (
                <Link href="/tickets" className="text-xs text-primary-600 hover:text-primary-800">הצג הכל →</Link>
              )}
            </div>
            {tickets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">אין כרטיסים</p>
            ) : (
              <div className="space-y-2">
                {tickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="text-sm border-r-2 border-green-200 pr-3 py-1">
                    <div className="font-medium text-gray-700">{t.name}</div>
                    <div className="text-xs text-gray-500">{currencySymbol(t.currency)}{t.price_customer}</div>
                    <div className="text-xs text-gray-400">{t.booked_qty || 0}/{t.total_qty || 0}</div>
                  </div>
                ))}
                {tickets.length > 5 && (
                  <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
                    + עוד {tickets.length - 5} כרטיסים
                  </div>
                )}
              </div>
            )}
          </div>

          {packages.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-base font-semibold text-gray-800 mb-3">📦 חבילות ({packages.length})</h3>
              <div className="space-y-2">
                {packages.map((p) => (
                  <div key={p.id} className="text-sm border-r-2 border-purple-200 pr-3 py-1">
                    <div className="font-medium text-gray-700">{p.name}</div>
                    <div className="text-xs text-gray-500">₪{p.price_total}/אדם</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
