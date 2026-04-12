"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

function currencySymbol(c: string) { return c === "USD" ? "$" : c === "EUR" ? "€" : "₪"; }

export default function RoomsArchivePage() {
  const params = useParams();
  const id = params.id as string;
  const [hotel, setHotel] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch(`/api/hotels/${id}`).then((r) => r.json()),
      fetch(`/api/hotels/${id}/rooms`).then((r) => r.json()),
    ])
      .then(([hotelData, roomsData]) => {
        if (hotelData.error) { setError(hotelData.error); return; }
        setHotel(hotelData);
        if (Array.isArray(roomsData)) setRooms(roomsData);
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [id]);

  async function handleDelete(roomId: string) {
    if (!confirm("למחוק חדר זה לצמיתות?")) return;
    await fetch(`/api/hotels/${id}/rooms`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id: roomId }),
    });
    loadData();
  }

  async function handleRestore(room: any) {
    // Restore by extending check_out to future (30 days from today)
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const newCheckOut = future.toISOString().split("T")[0];

    await fetch(`/api/hotels/${id}/rooms`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_id: room.id,
        event_id: room.event_id,
        room_type: room.room_type,
        check_in: room.check_in?.split("T")[0],
        check_out: newCheckOut,
        price_company: room.price_company,
        price_customer: room.price_customer,
        currency: room.currency,
        capacity: room.capacity,
        total_rooms: room.total_rooms,
      }),
    });
    loadData();
  }

  const archivedRooms = rooms.filter((r) => r.check_out && r.check_out.split("T")[0] < today);

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (error) return <div className="text-center text-red-500 py-12">שגיאה: {error}</div>;
  if (!hotel) return <div className="text-center text-red-500 py-12">מלון לא נמצא</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-700">📦 ארכיון חדרים - {hotel.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            חדרים שהתאריך שלהם עבר - {archivedRooms.length} חדרים
          </p>
        </div>
        <Link
          href={`/hotels/${id}/rooms`}
          className="text-primary-700 hover:text-primary-800 text-sm font-medium px-4 py-2.5"
        >
          ← חזרה לחדרים פעילים
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {archivedRooms.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-sm">אין חדרים בארכיון</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">אירוע</th>
                  <th className="text-right px-4 py-3 font-medium">סוג חדר</th>
                  <th className="text-right px-4 py-3 font-medium">צ&apos;ק-אין</th>
                  <th className="text-right px-4 py-3 font-medium">צ&apos;ק-אאוט</th>
                  <th className="text-right px-4 py-3 font-medium">אנשים</th>
                  <th className="text-right px-4 py-3 font-medium">עלות</th>
                  <th className="text-right px-4 py-3 font-medium">מחיר</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {archivedRooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50 bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600">
                      {(room.events as { name: string })?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{room.room_type || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {room.check_in ? new Date(room.check_in).toLocaleDateString("he-IL") : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {room.check_out ? new Date(room.check_out).toLocaleDateString("he-IL") : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{room.capacity || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{currencySymbol(room.currency)}{room.price_company || 0}</td>
                    <td className="px-4 py-3 text-gray-600">{currencySymbol(room.currency)}{room.price_customer || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleRestore(room)} className="text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50 text-xs" title="שחזור לחדר פעיל (הארך תאריך)">
                          ♻️ שחזר
                        </button>
                        <button onClick={() => handleDelete(room.id)} className="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-xs" title="מחק לצמיתות">
                          🗑️ מחק
                        </button>
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
