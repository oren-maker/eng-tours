"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

  useEffect(() => {
    Promise.all([
      fetch(`/api/events/${eventId}`).then((r) => r.json()),
      fetch(`/api/orders`).then((r) => r.json()),
      fetch(`/api/flights?event_id=${eventId}`).then((r) => r.json()),
      fetch(`/api/rooms`).then((r) => r.json()),
      fetch(`/api/tickets`).then((r) => r.json()),
      fetch(`/api/packages`).then((r) => r.json()),
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
  }, [eventId]);

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!event || event.error) return <div className="text-center text-red-500 py-12">אירוע לא נמצא</div>;

  // Calculate statistics
  const totalOrders = orders.length;
  const confirmedOrders = orders.filter((o) => o.status === "confirmed" || o.status === "completed").length;
  const pendingOrders = orders.filter((o) => o.status === "pending_payment" || o.status === "draft").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

  // Revenue
  const confirmedRevenue = orders
    .filter((o) => o.status === "confirmed" || o.status === "completed")
    .reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const totalPaid = orders.reduce((sum, o) => sum + (Number(o.amount_paid) || 0), 0);

  // Flight statistics
  const totalSeats = flights.reduce((sum, f) => sum + (f.total_seats || 0), 0);
  const bookedSeats = flights.reduce((sum, f) => sum + (f.booked_seats || 0), 0);

  // Room statistics
  const totalRooms = rooms.reduce((sum, r) => sum + (r.total_rooms || 0), 0);
  const bookedRooms = rooms.reduce((sum, r) => sum + (r.booked_rooms || 0), 0);

  // Financial calculation
  const totalCost = flights.reduce((sum, f) => sum + ((f.price_company || 0) * (f.booked_seats || 0)), 0)
    + rooms.reduce((sum, r) => sum + ((r.price_company || 0) * (r.booked_rooms || 0)), 0);
  const profit = confirmedRevenue - totalCost;
  const profitMargin = confirmedRevenue > 0 ? ((profit / confirmedRevenue) * 100) : 0;

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
            <Link href={`/events/${eventId}`} className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors">
              ✏️ ערוך אירוע
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-primary-500">
          <div className="text-xs text-gray-500 mb-1">סה״כ הכנסות מאושרות</div>
          <div className="text-2xl font-bold text-gray-800">₪{confirmedRevenue.toLocaleString("he-IL")}</div>
          <div className="text-xs text-gray-400 mt-1">שולם: ₪{totalPaid.toLocaleString("he-IL")}</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border-r-4 border-green-500">
          <div className="text-xs text-gray-500 mb-1">רווח גולמי</div>
          <div className="text-2xl font-bold text-gray-800">₪{profit.toLocaleString("he-IL")}</div>
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

          {/* Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">פילוח סטטוסים</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{confirmedOrders}</div>
                <div className="text-xs text-green-600">מאושרות</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-yellow-700">{pendingOrders}</div>
                <div className="text-xs text-yellow-600">ממתינות</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{cancelledOrders}</div>
                <div className="text-xs text-red-600">מבוטלות</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{totalOrders - confirmedOrders - pendingOrders - cancelledOrders}</div>
                <div className="text-xs text-blue-600">אחר</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Resources (1/3) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">✈️ טיסות ({flights.length})</h3>
            {flights.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">אין טיסות</p>
            ) : (
              <div className="space-y-2">
                {flights.map((f) => (
                  <div key={f.id} className="text-sm border-r-2 border-primary-200 pr-3 py-1">
                    <div className="font-medium text-gray-700">{f.airline_name} {f.flight_code}</div>
                    <div className="text-xs text-gray-500">{f.origin_iata} → {f.dest_iata}</div>
                    <div className="text-xs text-gray-400">{f.booked_seats || 0}/{f.total_seats || 0} מקומות</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">🏨 חדרים ({rooms.length})</h3>
            {rooms.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">אין חדרים</p>
            ) : (
              <div className="space-y-2">
                {rooms.map((r) => (
                  <div key={r.id} className="text-sm border-r-2 border-orange-200 pr-3 py-1">
                    <div className="font-medium text-gray-700">{r.hotels?.name || "מלון"}</div>
                    <div className="text-xs text-gray-500">{r.room_type} · {currencySymbol(r.currency)}{r.price_customer}/אדם</div>
                    <div className="text-xs text-gray-400">{r.booked_rooms || 0}/{r.total_rooms || 0} חדרים</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-base font-semibold text-gray-800 mb-3">🎫 כרטיסים ({tickets.length})</h3>
            {tickets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">אין כרטיסים</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div key={t.id} className="text-sm border-r-2 border-green-200 pr-3 py-1">
                    <div className="font-medium text-gray-700">{t.name}</div>
                    <div className="text-xs text-gray-500">{currencySymbol(t.currency)}{t.price_customer}</div>
                    <div className="text-xs text-gray-400">{t.booked_qty || 0}/{t.total_qty || 0}</div>
                  </div>
                ))}
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
