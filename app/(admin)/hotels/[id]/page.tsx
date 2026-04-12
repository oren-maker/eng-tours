"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const ROOM_TYPES = [
  { value: "single", label: "סינגל" },
  { value: "double", label: "דאבל" },
  { value: "triple", label: "טריפל" },
  { value: "suite", label: "סוויטה" },
  { value: "family", label: "משפחתי" },
];

function roomTypeLabel(val: string) {
  return ROOM_TYPES.find((t) => t.value === val)?.label || val;
}

export default function HotelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [hotel, setHotel] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Room form state
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [roomForm, setRoomForm] = useState({
    room_type: "double",
    capacity: "2",
    price_company: "",
    price_customer: "",
    total_rooms: "",
  });

  function loadData() {
    setLoading(true);
    fetch(`/api/hotels/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("מלון לא נמצא");
        return r.json();
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setHotel(data);
        setRooms(data.rooms || []);
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleRoomChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setRoomForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      const payload = {
        room_type: roomForm.room_type,
        capacity: roomForm.capacity ? Number(roomForm.capacity) : null,
        price_company: roomForm.price_company ? Number(roomForm.price_company) : null,
        price_customer: roomForm.price_customer ? Number(roomForm.price_customer) : null,
        total_rooms: roomForm.total_rooms ? Number(roomForm.total_rooms) : null,
      };

      const res = await fetch(`/api/hotels/${id}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירה");
      }

      setRoomForm({
        room_type: "double",
        capacity: "2",
        price_company: "",
        price_customer: "",
        total_rooms: "",
      });
      setShowForm(false);
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm("למחוק את החדר?")) return;
    try {
      const res = await fetch(`/api/hotels/${id}/rooms?roomId=${roomId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("שגיאה במחיקה");
      loadData();
    } catch {
      alert("שגיאה במחיקת החדר");
    }
  }

  // Calculated fields
  function profitPerPerson(room: any) {
    const cost = Number(room.price_company) || 0;
    const price = Number(room.price_customer) || 0;
    return price - cost;
  }

  function profitPercent(room: any) {
    const cost = Number(room.price_company) || 0;
    const price = Number(room.price_customer) || 0;
    if (cost === 0) return 0;
    return ((price - cost) / cost) * 100;
  }

  // Live calculation for form
  const formProfitPerPerson =
    roomForm.price_customer && roomForm.price_company
      ? Number(roomForm.price_customer) - Number(roomForm.price_company)
      : null;
  const formProfitPercent =
    roomForm.price_customer && roomForm.price_company && Number(roomForm.price_company) > 0
      ? (((Number(roomForm.price_customer) - Number(roomForm.price_company)) /
          Number(roomForm.price_company)) *
          100)
      : null;

  if (loading)
    return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (error)
    return (
      <div className="text-center text-red-500 py-12">שגיאה: {error}</div>
    );
  if (!hotel)
    return (
      <div className="text-center text-red-500 py-12">מלון לא נמצא</div>
    );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary-900">{hotel.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {hotel.city && `${hotel.city}, `}
            {hotel.country || ""}
            {hotel.stars ? ` | ${"★".repeat(hotel.stars)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/hotels/${id}/rooms`}
            className="text-primary-700 hover:text-primary-800 text-sm font-medium"
          >
            ניהול חדרים מתקדם
          </Link>
          <Link
            href="/hotels"
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            חזרה למלונות
          </Link>
        </div>
      </div>

      {/* Hotel Info Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">פרטי מלון</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">שם המלון</span>
            <p className="font-medium text-gray-800">{hotel.name}</p>
          </div>
          <div>
            <span className="text-gray-500">מדינה</span>
            <p className="font-medium text-gray-800">{hotel.country || "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">עיר</span>
            <p className="font-medium text-gray-800">{hotel.city || "—"}</p>
          </div>
          <div>
            <span className="text-gray-500">כוכבים</span>
            <p className="font-medium text-gray-800">
              {hotel.stars ? "★".repeat(hotel.stars) : "—"}
            </p>
          </div>
          {hotel.contact_name && (
            <div>
              <span className="text-gray-500">איש קשר</span>
              <p className="font-medium text-gray-800">{hotel.contact_name}</p>
            </div>
          )}
          {hotel.contact_phone && (
            <div>
              <span className="text-gray-500">טלפון</span>
              <p className="font-medium text-gray-800">{hotel.contact_phone}</p>
            </div>
          )}
          {hotel.contact_email && (
            <div>
              <span className="text-gray-500">אימייל</span>
              <p className="font-medium text-gray-800">{hotel.contact_email}</p>
            </div>
          )}
          {hotel.website && (
            <div>
              <span className="text-gray-500">אתר</span>
              <p className="font-medium text-gray-800">
                <a
                  href={hotel.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-700 hover:underline"
                >
                  {hotel.website}
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rooms Section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">חדרים</h3>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
          >
            {showForm ? "סגור" : "הוסף חדר"}
          </button>
        </div>

        {/* Inline Add Room Form */}
        {showForm && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <form onSubmit={handleAddRoom}>
              {formError && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    סוג חדר
                  </label>
                  <select
                    name="room_type"
                    value={roomForm.room_type}
                    onChange={handleRoomChange}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    כמות אנשים בחדר
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={roomForm.capacity}
                    onChange={handleRoomChange}
                    min={1}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    עלות שלנו לאדם ($)
                  </label>
                  <input
                    type="number"
                    name="price_company"
                    value={roomForm.price_company}
                    onChange={handleRoomChange}
                    min={0}
                    step="0.01"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מחיר לצרכן לאדם ($)
                  </label>
                  <input
                    type="number"
                    name="price_customer"
                    value={roomForm.price_customer}
                    onChange={handleRoomChange}
                    min={0}
                    step="0.01"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    כמות חדרים זמינים
                  </label>
                  <input
                    type="number"
                    name="total_rooms"
                    value={roomForm.total_rooms}
                    onChange={handleRoomChange}
                    min={0}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50"
                  >
                    {formLoading ? "שומר..." : "הוסף"}
                  </button>
                </div>
              </div>

              {/* Live profit calculation */}
              {formProfitPerPerson !== null && (
                <div className="mt-3 flex gap-6 text-sm">
                  <span className="text-gray-600">
                    רווח לאדם:{" "}
                    <span
                      className={`font-semibold ${
                        formProfitPerPerson >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      ${formProfitPerPerson.toFixed(2)}
                    </span>
                  </span>
                  {formProfitPercent !== null && (
                    <span className="text-gray-600">
                      אחוז רווח:{" "}
                      <span
                        className={`font-semibold ${
                          formProfitPercent >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formProfitPercent.toFixed(1)}%
                      </span>
                    </span>
                  )}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Rooms Table */}
        {rooms.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-sm">אין חדרים עדיין למלון זה</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">סוג חדר</th>
                  <th className="text-right px-4 py-3 font-medium">
                    כמות אנשים
                  </th>
                  <th className="text-right px-4 py-3 font-medium">
                    עלות לאדם ($)
                  </th>
                  <th className="text-right px-4 py-3 font-medium">
                    מחיר לצרכן ($)
                  </th>
                  <th className="text-right px-4 py-3 font-medium">רווח</th>
                  <th className="text-right px-4 py-3 font-medium">
                    חדרים זמינים
                  </th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map((room) => {
                  const profit = profitPerPerson(room);
                  const pct = profitPercent(room);
                  return (
                    <tr
                      key={room.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        {roomTypeLabel(room.room_type)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {room.capacity || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        ${Number(room.price_company || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        ${Number(room.price_customer || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ${profit.toFixed(2)}
                        </span>
                        <span className="text-gray-400 text-xs mr-1">
                          ({pct.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {room.total_rooms ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          מחק
                        </button>
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
