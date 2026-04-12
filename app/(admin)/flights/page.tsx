import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import FlightsFilter from "./flights-filter";

export default async function FlightsPage({
  searchParams,
}: {
  searchParams: Promise<{ event_id?: string }>;
}) {
  const { event_id } = await searchParams;
  const supabase = createServiceClient();

  // Load events for filter dropdown
  const { data: events } = await supabase
    .from("events")
    .select("id, name, event_id")
    .eq("status", "active")
    .order("name");

  // Load flights, optionally filtered by event
  let query = supabase
    .from("flights")
    .select("*, events(name, event_id)")
    .order("departure_date", { ascending: true });

  if (event_id) {
    query = query.eq("event_id", event_id);
  }

  const { data: flights, error } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-900">טיסות</h2>
        <Link
          href="/flights/new"
          className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          + טיסה חדשה
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <FlightsFilter events={events || []} selectedEventId={event_id} />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {error ? (
          <div className="text-center text-red-500 py-12">
            שגיאה בטעינת טיסות: {error.message}
          </div>
        ) : !flights || flights.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">✈️</div>
            <p className="text-lg font-medium text-gray-500">אין טיסות עדיין</p>
            <p className="text-sm mt-1">הוסף טיסה חדשה כדי להתחיל</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">קוד טיסה</th>
                  <th className="text-right px-4 py-3 font-medium">חברה</th>
                  <th className="text-right px-4 py-3 font-medium">מוצא</th>
                  <th className="text-right px-4 py-3 font-medium">יעד</th>
                  <th className="text-right px-4 py-3 font-medium">תאריך</th>
                  <th className="text-right px-4 py-3 font-medium">מקומות</th>
                  <th className="text-right px-4 py-3 font-medium">מחיר</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {flights.map((flight) => {
                  const occupancy = flight.total_seats
                    ? Math.round(((flight.booked_seats || 0) / flight.total_seats) * 100)
                    : 0;
                  return (
                    <tr key={flight.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {flight.flight_code}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{flight.airline}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {flight.origin_city} ({flight.origin_iata})
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {flight.dest_city} ({flight.dest_iata})
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {flight.departure_date
                          ? new Date(flight.departure_date).toLocaleDateString("he-IL")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">
                            {flight.booked_seats || 0}/{flight.total_seats || 0}
                          </span>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                occupancy >= 90
                                  ? "bg-red-500"
                                  : occupancy >= 70
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(occupancy, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        ${flight.price_usd || 0}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/flights/${flight.id}`}
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
