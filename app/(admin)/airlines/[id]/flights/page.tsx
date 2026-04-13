"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FlightRowForm from "./flight-row-form";

function currencySymbol(c?: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

export default function AirlineFlightsPage() {
  const params = useParams();
  const id = params.id as string;
  const [airline, setAirline] = useState<any>(null);
  const [flights, setFlights] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<any>(null);
  const [search, setSearch] = useState("");

  const today = new Date().toISOString().split("T")[0];

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch(`/api/airlines/${id}`).then((r) => r.json()),
      fetch(`/api/airlines/${id}/flights`).then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
    ])
      .then(([airlineData, flightsData, eventsData]) => {
        setAirline(airlineData);
        if (Array.isArray(flightsData)) setFlights(flightsData);
        if (Array.isArray(eventsData)) setEvents(eventsData);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [id]);

  async function handleDelete(flightId: string) {
    if (!confirm("למחוק טיסה זו?")) return;
    await fetch(`/api/airlines/${id}/flights`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flight_id: flightId }),
    });
    loadData();
  }

  function startEdit(f: any) { setEditingFlight(f); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function handleFormDone() { setShowForm(false); setEditingFlight(null); loadData(); }

  const searchLower = search.trim().toLowerCase();
  const matchesSearch = (f: any) => {
    if (!searchLower) return true;
    return (
      f.flight_code?.toLowerCase().includes(searchLower) ||
      f.origin_city?.toLowerCase().includes(searchLower) ||
      f.origin_iata?.toLowerCase().includes(searchLower) ||
      f.dest_city?.toLowerCase().includes(searchLower) ||
      f.dest_iata?.toLowerCase().includes(searchLower) ||
      f.events?.name?.toLowerCase().includes(searchLower)
    );
  };

  const activeFlights = flights.filter((f) => (!f.arrival_time || f.arrival_time.split("T")[0] >= today) && matchesSearch(f));
  const archivedFlights = flights.filter((f) => f.arrival_time && f.arrival_time.split("T")[0] < today && matchesSearch(f));

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!airline) return <div className="text-center text-red-500 py-12">חברה לא נמצאה</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary-900">✈️ טיסות - {airline.name}</h2>
          <p className="text-sm text-gray-500 mt-1">{airline.country || "—"} | {airline.iata_code || "—"}</p>
        </div>
        <div className="flex gap-2">
          {!showForm && (
            <button onClick={() => { setEditingFlight(null); setShowForm(true); }}
              className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors">
              + הוסף טיסה
            </button>
          )}
          {archivedFlights.length > 0 && (
            <Link href={`/airlines/${id}/flights/archive`}
              className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              📦 ארכיון ({archivedFlights.length})
            </Link>
          )}
          <Link href="/airlines" className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2.5">
            חזרה לחברות תעופה
          </Link>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 חפש טיסה: קוד, מסלול (TLV, LCA), אירוע..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
        />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">{editingFlight ? "עריכת טיסה" : "הוספת טיסה חדשה"}</h3>
            <button onClick={() => { setShowForm(false); setEditingFlight(null); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <FlightRowForm airlineId={id} events={events} flight={editingFlight} onDone={handleFormDone} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-800 p-4 border-b border-gray-100">טיסות פעילות ({activeFlights.length})</h3>
        {activeFlights.length === 0 ? (
          <div className="text-center text-gray-400 py-12"><p className="text-sm">אין טיסות פעילות</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-3 py-3 font-medium">אירוע</th>
                  <th className="text-right px-3 py-3 font-medium">קוד טיסה</th>
                  <th className="text-right px-3 py-3 font-medium">מסלול</th>
                  <th className="text-right px-3 py-3 font-medium">יציאה</th>
                  <th className="text-right px-3 py-3 font-medium">חזרה</th>
                  <th className="text-right px-3 py-3 font-medium">מקומות</th>
                  <th className="text-right px-3 py-3 font-medium">מחיר</th>
                  <th className="text-right px-3 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeFlights.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-700">{f.events?.name || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{f.flight_code || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">
                      {f.origin_iata && f.dest_iata ? `${f.origin_iata} → ${f.dest_iata}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">
                      {f.departure_time ? new Date(f.departure_time).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">
                      {f.arrival_time ? new Date(f.arrival_time).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{f.booked_seats || 0}/{f.total_seats || 0}</td>
                    <td className="px-3 py-2.5 text-gray-800 font-medium">{currencySymbol(f.currency)}{f.price_customer || 0}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(f)} className="text-primary-600 hover:text-primary-800 px-1.5 py-1 rounded hover:bg-primary-50 text-xs">✏️</button>
                        <button onClick={() => handleDelete(f.id)} className="text-red-500 hover:text-red-700 px-1.5 py-1 rounded hover:bg-red-50 text-xs">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
