"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cachedFetch, invalidateCache } from "@/lib/cached-fetch";

export default function IssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  function loadData() {
    setLoading(true);
    invalidateCache("/api/issues");
    cachedFetch<any[]>("/api/issues")
      .then((data) => Array.isArray(data) ? setIssues(data) : setIssues([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  const searchLower = search.trim().toLowerCase();
  const filtered = issues.filter((i) => {
    if (!searchLower) return true;
    return (
      i.confirmation_number?.toLowerCase().includes(searchLower) ||
      i.notes?.toLowerCase().includes(searchLower) ||
      i.order?.events?.name?.toLowerCase().includes(searchLower) ||
      i.order?.event_id?.toLowerCase().includes(searchLower) ||
      i.order_id?.toLowerCase().includes(searchLower)
    );
  });

  const typeLabels: Record<string, string> = {
    flight: "✈️ טיסה",
    room: "🏨 חדר",
    ticket: "🎫 כרטיס",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-red-700">⚠️ בעיות פתוחות</h2>
          <p className="text-sm text-gray-500 mt-1">כל הפריטים שסומנו על ידי ספק כ״יש בעיה״</p>
        </div>
        <button
          onClick={loadData}
          className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800"
        >
          🔄 רענן
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 חפש: מספר אישור, הערה, אירוע, הזמנה..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            {filtered.length} בעיות{search && ` מתוך ${issues.length}`}
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-lg font-medium text-gray-500">
              {search ? "אין תוצאות" : "אין בעיות פתוחות!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((issue) => {
              const passengers = issue.order?.participants?.map((p: any) => `${p.first_name_en} ${p.last_name_en}`).join(", ");
              return (
                <div key={issue.id} className="p-4 hover:bg-red-50 transition-colors">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-lg">{typeLabels[issue.item_type] || issue.item_type}</span>
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          ⚠️ בעיה
                        </span>
                        {issue.confirmation_number && (
                          <span className="text-xs font-mono text-gray-500" dir="ltr">
                            #{issue.confirmation_number}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-sm">
                        {issue.order?.events?.name && (
                          <div className="text-gray-700">
                            <span className="text-gray-500">אירוע:</span> {issue.order.events.name}
                            {issue.order?.event_id && <span className="text-xs text-gray-400 mr-2">({issue.order.event_id})</span>}
                          </div>
                        )}
                        {passengers && (
                          <div className="text-gray-700">
                            <span className="text-gray-500">נוסעים:</span> {passengers}
                          </div>
                        )}
                        {issue.notes && (
                          <div className="text-gray-600 bg-gray-50 px-3 py-1.5 rounded mt-2">
                            💬 {issue.notes}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 mt-2">
                        דווח: {new Date(issue.created_at).toLocaleString("he-IL")}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/orders/${issue.order_id}`}
                        className="text-xs bg-primary-700 text-white px-3 py-1.5 rounded hover:bg-primary-800 text-center"
                      >
                        📋 פתח הזמנה
                      </Link>
                      {issue.order?.total_price && (
                        <span className="text-xs text-gray-500 text-center">
                          ₪{Number(issue.order.total_price).toLocaleString("he-IL")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
