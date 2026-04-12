export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

function StarRating({ stars }: { stars: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {"★".repeat(stars)}
      {"☆".repeat(Math.max(0, 5 - stars))}
    </span>
  );
}

export default async function HotelsPage() {
  const supabase = createServiceClient();
  const { data: hotels, error } = await supabase
    .from("hotels")
    .select("*")
    .order("name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-900">מלונות</h2>
        <Link
          href="/hotels/new"
          className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          + מלון חדש
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {error ? (
          <div className="text-center text-red-500 py-12">
            שגיאה בטעינת מלונות: {error.message}
          </div>
        ) : !hotels || hotels.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">🏨</div>
            <p className="text-lg font-medium text-gray-500">אין מלונות עדיין</p>
            <p className="text-sm mt-1">הוסף מלון חדש כדי להתחיל</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">שם המלון</th>
                  <th className="text-right px-4 py-3 font-medium">עיר</th>
                  <th className="text-right px-4 py-3 font-medium">מדינה</th>
                  <th className="text-right px-4 py-3 font-medium">דירוג</th>
                  <th className="text-right px-4 py-3 font-medium">טלפון</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hotels.map((hotel) => (
                  <tr key={hotel.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {hotel.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{hotel.city || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{hotel.country || "—"}</td>
                    <td className="px-4 py-3">
                      <StarRating stars={hotel.stars || 0} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                      {hotel.contact_phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/hotels/${hotel.id}/rooms`}
                          className="text-primary-700 hover:text-primary-800 text-xs font-medium"
                        >
                          חדרים
                        </Link>
                        <Link
                          href={`/hotels/${hotel.id}`}
                          className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                        >
                          עריכה
                        </Link>
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
