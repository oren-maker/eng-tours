"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoomForm from "./room-form";

function currencySymbol(c: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

export default function HotelRoomsPage() {
  const params = useParams();
  const id = params.id as string;
  const [hotel, setHotel] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const today = new Date().toISOString().split("T")[0];

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch(`/api/hotels/${id}`).then((r) => r.json()),
      fetch(`/api/hotels/${id}/rooms`).then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
    ])
      .then(([hotelData, roomsData, eventsData]) => {
        if (hotelData.error) { setError(hotelData.error); return; }
        setHotel(hotelData);
        if (Array.isArray(roomsData)) setRooms(roomsData);
        if (Array.isArray(eventsData)) setEvents(eventsData);
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [id]);

  function isPast(checkOut: string) {
    if (!checkOut) return false;
    return checkOut < today;
  }

  async function handleDelete(roomId: string) {
    if (!confirm("למחוק חדר זה?")) return;
    await fetch(`/api/hotels/${id}/rooms`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: roomId }),
    });
    loadData();
  }

  function startEdit(room: any) {
    setEditingRoom(room);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFormDone() {
    setShowForm(false);
    setEditingRoom(null);
    loadData();
  }

  // Separate active and archived rooms
  const searchLower = search.trim().toLowerCase();
  const matchesSearch = (r: any) => {
    if (!searchLower) return true;
    return (
      r.room_type?.toLowerCase().includes(searchLower) ||
      r.events?.name?.toLowerCase().includes(searchLower) ||
      String(r.price_customer || "").includes(searchLower)
    );
  };

  const activeRooms = rooms.filter((r) => !isPast(r.check_out) && matchesSearch(r));
  const archivedRooms = rooms.filter((r) => isPast(r.check_out) && matchesSearch(r));

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (error) return <div className="text-center text-red-500 py-12">שגיאה: {error}</div>;
  if (!hotel) return <div className="text-center text-red-500 py-12">מלון לא נמצא</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary-900">חדרים - {hotel.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {hotel.city}, {hotel.country} | {"★".repeat(hotel.stars || 0)}
          </p>
        </div>
        <div className="flex gap-2">
          {!showForm && (
            <button
              onClick={() => { setEditingRoom(null); setShowForm(true); }}
              className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
            >
              + הוסף חדר
            </button>
          )}
          {archivedRooms.length > 0 && (
            <Link
              href={`/hotels/${id}/rooms/archive`}
              className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              📦 ארכיון ({archivedRooms.length})
            </Link>
          )}
          <Link href="/hotels" className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2.5">
            חזרה למלונות
          </Link>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 חפש חדר: סוג, אירוע, מחיר..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
        />
      </div>

      {/* Add/Edit room form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingRoom ? "עריכת חדר" : "הוספת חדר חדש"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingRoom(null); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <RoomForm hotelId={id} events={events} room={editingRoom} onDone={handleFormDone} />
        </div>
      )}

      {/* Active Rooms */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <h3 className="text-lg font-semibold text-gray-800 p-4 border-b border-gray-100">
          חדרים פעילים ({activeRooms.length})
        </h3>
        {activeRooms.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-sm">אין חדרים פעילים</p>
          </div>
        ) : (
          <RoomsTable rooms={activeRooms} onEdit={startEdit} onDelete={handleDelete} />
        )}
      </div>

    </div>
  );
}

function RoomsTable({ rooms, onEdit, onDelete, archived }: { rooms: any[]; onEdit: (r: any) => void; onDelete: (id: string) => void; archived?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-600">
            <th className="text-right px-4 py-3 font-medium">אירוע</th>
            <th className="text-right px-4 py-3 font-medium">סוג חדר</th>
            <th className="text-right px-4 py-3 font-medium">צ&apos;ק-אין</th>
            <th className="text-right px-4 py-3 font-medium">צ&apos;ק-אאוט</th>
            <th className="text-right px-4 py-3 font-medium">אנשים</th>
            <th className="text-right px-4 py-3 font-medium">עלות לאדם</th>
            <th className="text-right px-4 py-3 font-medium">מחיר לצרכן</th>
            <th className="text-right px-4 py-3 font-medium">רווח</th>
            <th className="text-right px-4 py-3 font-medium">חדרים</th>
            <th className="text-right px-4 py-3 font-medium">פעולות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rooms.map((room) => {
            const profit = (room.price_customer || 0) - (room.price_company || 0);
            const profitPct = room.price_company > 0 ? ((profit / room.price_company) * 100).toFixed(0) : "—";
            return (
              <tr key={room.id} className={`transition-colors ${archived ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                <td className="px-4 py-3 text-gray-800">
                  {(room.events as { name: string })?.name || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600 font-medium">{room.room_type || "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {room.check_in ? new Date(room.check_in).toLocaleDateString("he-IL") : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {room.check_out ? new Date(room.check_out).toLocaleDateString("he-IL") : "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">{room.capacity || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{currencySymbol(room.currency)}{room.price_company || 0}</td>
                <td className="px-4 py-3 text-gray-800 font-medium">{currencySymbol(room.currency)}{room.price_customer || 0}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${profit > 0 ? "text-green-600" : profit < 0 ? "text-red-600" : "text-gray-400"}`}>
                    {currencySymbol(room.currency)}{profit} ({profitPct}%)
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {room.booked_rooms || 0}/{room.total_rooms || 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(room)} className="text-primary-600 hover:text-primary-800 px-2 py-1 rounded hover:bg-primary-50 text-xs">
                      ✏️ ערוך
                    </button>
                    <button onClick={() => onDelete(room.id)} className="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-xs">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
