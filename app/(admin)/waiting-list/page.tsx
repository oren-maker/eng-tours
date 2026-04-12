"use client";

import { useState, useEffect, useCallback } from "react";

interface WaitlistEntry {
  id: string;
  event_id: string;
  event_name?: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  position: number;
  notified: boolean;
  notified_at: string | null;
  created_at: string;
}

interface EventOption {
  id: string;
  event_id: string;
  name: string;
}

export default function WaitingListPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [filterEvent, setFilterEvent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : data.events || []);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEvent) params.set("event_id", filterEvent);

      const res = await fetch(`/api/waiting-list?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to fetch waitlist:", err);
    } finally {
      setLoading(false);
    }
  }, [filterEvent]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  const handleSendInvite = async (entry: WaitlistEntry) => {
    setSending(entry.id);
    try {
      // Mark as notified
      const res = await fetch(`/api/waiting-list`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          notified: true,
          notified_at: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        alert(`הזמנה נשלחה ל-${entry.full_name}`);
        fetchWaitlist();
      } else {
        alert("שגיאה בשליחת הזמנה");
      }
    } catch {
      alert("שגיאה בשליחת הזמנה");
    } finally {
      setSending(null);
    }
  };

  const handleNotifyNext = async () => {
    const next = entries.find((e) => !e.notified);
    if (!next) {
      alert("אין אנשים בתור שלא קיבלו הודעה");
      return;
    }
    await handleSendInvite(next);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-primary-900">רשימת המתנה</h2>
        <button
          onClick={handleNotifyNext}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          הודע לבא בתור
        </button>
      </div>

      {/* Event Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">סינון לפי אירוע</label>
        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="w-full sm:w-80 rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">כל האירועים</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.event_id || ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מייל</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">טלפון</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">WhatsApp</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">מיקום בתור</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">נשלחה הודעה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">תאריך</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    טוען...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    אין רשומות ברשימת ההמתנה
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{entry.full_name}</td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">
                      {entry.email}
                    </td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">
                      {entry.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">
                      {entry.whatsapp || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        #{entry.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.notified ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          נשלחה
                          {entry.notified_at && (
                            <span className="mr-1">({formatDate(entry.notified_at)})</span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          ממתין
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {!entry.notified && (
                        <button
                          onClick={() => handleSendInvite(entry)}
                          disabled={sending === entry.id}
                          className="text-primary-700 hover:text-primary-900 text-xs font-medium disabled:opacity-50"
                        >
                          {sending === entry.id ? "שולח..." : "שלח הזמנה"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
