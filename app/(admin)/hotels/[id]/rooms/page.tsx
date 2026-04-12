"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoomForm from "./room-form";

export default function HotelRoomsPage() {
  const params = useParams();
  const id = params.id as string;
  const [hotel, setHotel] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/hotels/${id}`).then((r) => {
        if (!r.ok) throw new Error("מלון לא נמצא");
        return r.json();
      }),
      fetch(`/api/hotels/${id}/rooms`).then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
    ])
      .then(([hotelData, roomsData, eventsData]) => {
        if (hotelData.error) {
          setError(hotelData.error);
          return;
        }
        setHotel(hotelData);
        if (Array.isArray(roomsData)) setRooms(roomsData);
        if (Array.isArray(eventsData)) setEvents(eventsData);
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }, [id]);

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
        <Link
          href="/hotels"
          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          חזרה למלונות
        </Link>
      </div>

      {/* Add room form */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">הוספת חדר חדש</h3>
        <RoomForm hotelId={id} events={events} />
      </div>

      {/* Rooms list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-800 p-4 border-b border-gray-100">
          רשימת חדרים
        </h3>
        {rooms.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-sm">אין חדרים עדיין למלון זה</p>
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
                  <th className="text-right px-4 py-3 font-medium">מחיר ללילה</th>
                  <th className="text-right px-4 py-3 font-medium">קיבולת</th>
                  <th className="text-right px-4 py-3 font-medium">סה&quot;כ חדרים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-800">
                      {(room.events as { name: string })?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{room.room_type || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {room.check_in
                        ? new Date(room.check_in).toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {room.check_out
                        ? new Date(room.check_out).toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      ${room.price_customer || 0}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{room.capacity || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{room.total_rooms || "—"}</td>
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
