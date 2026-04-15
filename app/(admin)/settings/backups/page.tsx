"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function fmtSize(bytes: number) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
}

export default function BackupsArchivePage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backups?limit=500", { cache: "no-store" });
      const d = await res.json();
      setBackups(d.backups || []);
    } finally { setLoading(false); }
  }

  async function del(id: string) {
    if (!confirm("למחוק את הגיבוי הזה?")) return;
    await fetch(`/api/admin/backups/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-primary-700 hover:underline">← חזרה להגדרות</Link>
        <h2 className="text-2xl font-bold text-primary-900 mt-1">🗄️ ארכיון גיבויים</h2>
        <p className="text-sm text-gray-500 mt-1">כל הגיבויים ({backups.length}) · שומר עד 30 אחרונים</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : backups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">אין גיבויים</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="text-right p-3">תאריך</th>
                <th className="text-right p-3">מקור</th>
                <th className="text-right p-3">סטטוס</th>
                <th className="text-right p-3">טבלאות</th>
                <th className="text-right p-3">רשומות</th>
                <th className="text-right p-3">גודל</th>
                <th className="text-right p-3">זמן</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 text-gray-700">{fmtDate(b.created_at)}</td>
                  <td className="p-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {b.trigger === "auto" ? "אוטומטי" : "ידני"}
                    </span>
                  </td>
                  <td className="p-3">
                    {b.status === "success" ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">✓ הצלחה</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded" title={b.error_msg}>✗ כשל</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-700">{b.tables_count ?? "-"}</td>
                  <td className="p-3 text-gray-700">{b.rows_count ?? "-"}</td>
                  <td className="p-3 text-gray-700">{fmtSize(b.size_bytes)}</td>
                  <td className="p-3 text-gray-500 text-xs">{b.duration_ms ? `${(b.duration_ms / 1000).toFixed(1)}s` : "-"}</td>
                  <td className="p-3 text-left">
                    <div className="flex gap-1 justify-end">
                      {b.status === "success" && b.storage_path && (
                        <a
                          href={`/api/admin/backups/${b.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                        >
                          הורד
                        </a>
                      )}
                      <button
                        onClick={() => del(b.id)}
                        className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-100"
                      >
                        מחק
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
  );
}
