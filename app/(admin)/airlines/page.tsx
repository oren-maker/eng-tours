"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AirlinesPage() {
  const [airlines, setAirlines] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    Promise.all([
      fetch("/api/airlines").then((r) => r.json()),
      fetch("/api/flights").then((r) => r.json()),
    ])
      .then(([airlinesData, flightsData]) => {
        if (Array.isArray(airlinesData)) setAirlines(airlinesData);
        else setError(airlinesData.error || "שגיאה");
        if (Array.isArray(flightsData)) setFlights(flightsData);
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }, []);

  function activeFlightsCount(airlineId: string) {
    return flights.filter(
      (f) => f.airline_id === airlineId && (!f.arrival_time || f.arrival_time.split("T")[0] >= today)
    ).length;
  }

  function airlineInventory(airlineId: string) {
    const activeFlights = flights.filter(
      (f) => f.airline_id === airlineId && (!f.arrival_time || f.arrival_time.split("T")[0] >= today)
    );
    const total = activeFlights.reduce((s, f) => s + (f.total_seats || 0), 0);
    const booked = activeFlights.reduce((s, f) => s + (f.booked_seats || 0), 0);
    return { total, booked, flights: activeFlights.length };
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-900">חברות תעופה</h2>
        <Link href="/airlines/new" className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors">
          + חברת תעופה חדשה
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">טוען...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-12">שגיאה: {error}</div>
        ) : airlines.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">✈️</div>
            <p className="text-lg font-medium text-gray-500">אין חברות תעופה עדיין</p>
            <Link href="/airlines/new" className="inline-block mt-4 bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
              + חברת תעופה חדשה
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">שם</th>
                  <th className="text-right px-4 py-3 font-medium">מדינה</th>
                  <th className="text-right px-4 py-3 font-medium">IATA</th>
                  <th className="text-right px-4 py-3 font-medium">טיסות</th>
                  <th className="text-right px-4 py-3 font-medium">מצב מלאי</th>
                  <th className="text-right px-4 py-3 font-medium">איש קשר</th>
                  <th className="text-right px-4 py-3 font-medium">טלפון</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {airlines.map((a) => {
                  const count = activeFlightsCount(a.id);
                  const inv = airlineInventory(a.id);
                  const occupancy = inv.total > 0 ? Math.round((inv.booked / inv.total) * 100) : 0;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                      <td className="px-4 py-3 text-gray-600">{a.country || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{a.iata_code || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          count > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {count} טיסות
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.flights === 0 ? (
                          <span className="text-xs text-gray-400">אין טיסות</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 whitespace-nowrap">
                              {inv.booked}/{inv.total}
                            </span>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  occupancy >= 90 ? "bg-red-500" :
                                  occupancy >= 70 ? "bg-yellow-500" :
                                  "bg-green-500"
                                }`}
                                style={{ width: `${Math.min(occupancy, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{occupancy}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.contact_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs" dir="ltr">{a.contact_phone || "—"}</td>
                      <td className="px-4 py-3">
                        <Link href={`/airlines/${a.id}/flights`} className="text-primary-700 hover:text-primary-900 text-xs px-3 py-1 rounded border border-primary-200 hover:bg-primary-50 font-medium">
                          נהל טיסות
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
