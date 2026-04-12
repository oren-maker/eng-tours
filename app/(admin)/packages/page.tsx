export const dynamic = "force-dynamic";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";

export default async function PackagesPage() {
  const supabase = createServiceClient();
  const { data: packages, error } = await supabase
    .from("packages")
    .select("*, events(name, event_id), flights(flight_code, airline), rooms(room_type, hotels(name)), tickets(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary-900">חבילות</h2>
        <Link
          href="/packages/new"
          className="bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          + חבילה חדשה
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {error ? (
          <div className="text-center text-red-500 py-12">
            שגיאה בטעינת חבילות: {error.message}
          </div>
        ) : !packages || packages.length === 0 ? (
          <div className="text-center text-gray-400 py-16">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-lg font-medium text-gray-500">אין חבילות עדיין</p>
            <p className="text-sm mt-1">צור חבילה חדשה כדי להתחיל</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-right px-4 py-3 font-medium">שם החבילה</th>
                  <th className="text-right px-4 py-3 font-medium">אירוע</th>
                  <th className="text-right px-4 py-3 font-medium">טיסה</th>
                  <th className="text-right px-4 py-3 font-medium">חדר</th>
                  <th className="text-right px-4 py-3 font-medium">כרטיס</th>
                  <th className="text-right px-4 py-3 font-medium">מחיר</th>
                  <th className="text-right px-4 py-3 font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {pkg.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(pkg.events as { name: string })?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(pkg.flights as { flight_code: string; airline: string })
                        ? `${(pkg.flights as { airline: string }).airline} ${(pkg.flights as { flight_code: string }).flight_code}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(pkg.rooms as { room_type: string; hotels: { name: string } })
                        ? `${(pkg.rooms as { hotels: { name: string } }).hotels?.name || ""} - ${(pkg.rooms as { room_type: string }).room_type}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(pkg.tickets as { name: string })?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      ${pkg.total_price || 0}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/packages/${pkg.id}`}
                        className="text-primary-700 hover:text-primary-800 text-xs font-medium"
                      >
                        עריכה
                      </Link>
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
