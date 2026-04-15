"use client";

import BackToSettings from "@/components/back-to-settings";
import { useState, useEffect } from "react";

interface Settings {
  [key: string]: string | number | boolean;
}

interface SettingSection {
  title: string;
  icon: string;
  keys: {
    key: string;
    label: string;
    type: "text" | "number" | "toggle" | "textarea";
    placeholder?: string;
  }[];
}

const SECTIONS: SettingSection[] = [
  {
    title: "כללי",
    icon: "⚙️",
    keys: [
      {
        key: "low_stock_threshold",
        label: "סף מלאי נמוך",
        type: "number",
        placeholder: "10",
      },
      {
        key: "reminder_days_before",
        label: "ימים לפני תזכורת",
        type: "number",
        placeholder: "7",
      },
      {
        key: "default_currency",
        label: "מטבע ברירת מחדל",
        type: "text",
        placeholder: "ILS",
      },
    ],
  },
  {
    title: "אבטחה",
    icon: "🔒",
    keys: [
      {
        key: "session_duration_days",
        label: "משך סשן (ימים)",
        type: "number",
        placeholder: "30",
      },
      {
        key: "2fa_enabled",
        label: "אימות דו-שלבי",
        type: "toggle",
      },
    ],
  },
  {
    title: "תחזוקה",
    icon: "🔧",
    keys: [
      {
        key: "maintenance_mode",
        label: "מצב תחזוקה",
        type: "toggle",
      },
      {
        key: "maintenance_message",
        label: "הודעת תחזוקה",
        type: "textarea",
        placeholder: "המערכת בתחזוקה, נחזור בקרוב...",
      },
    ],
  },
  {
    title: "גיבוי",
    icon: "💾",
    keys: [
      {
        key: "backup_enabled",
        label: "גיבוי אוטומטי",
        type: "toggle",
      },
    ],
  },
  {
    title: "מייל",
    icon: "📧",
    keys: [
      {
        key: "sender_email",
        label: "כתובת שולח",
        type: "text",
        placeholder: "noreply@engtours.co.il",
      },
    ],
  },
  {
    title: "WhatsApp",
    icon: "💬",
    keys: [
      {
        key: "wesender_number",
        label: "מספר WeSender",
        type: "text",
        placeholder: "972501234567",
      },
    ],
  },
  {
    title: "אירועים",
    icon: "🎫",
    keys: [
      {
        key: "auto_activate_events",
        label: "הפעלה אוטומטית של אירועים",
        type: "toggle",
      },
      {
        key: "auto_activate_on_creation",
        label: "הפעל אירועים בעת יצירה",
        type: "toggle",
      },
      {
        key: "auto_archive_past_events",
        label: "ארכבה אוטומטית של אירועים שעברו",
        type: "toggle",
      },
      {
        key: "auto_send_reminders",
        label: "שלח תזכורות אוטומטיות",
        type: "toggle",
      },
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async (section: SettingSection) => {
    setSavingSection(section.title);
    try {
      const updates: Record<string, unknown> = {};
      for (const field of section.keys) {
        updates[field.key] = settings[field.key] ?? "";
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        alert("ההגדרות נשמרו בהצלחה");
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה בשמירה");
      }
    } catch {
      alert("שגיאה בשמירה");
    } finally {
      setSavingSection(null);
    }
  };

  const updateSetting = (key: string, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div>
        <BackToSettings />
        <h2 className="text-2xl font-bold text-primary-900 mb-6">הגדרות מערכת</h2>
        <div className="text-center py-12 text-gray-400">טוען הגדרות...</div>
      </div>
    );
  }

  return (
    <>
      <BackToSettings />
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">הגדרות מערכת</h2>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                <span className="ml-2">{section.icon}</span>
                {section.title}
              </h3>
              <button
                onClick={() => handleSaveSection(section)}
                disabled={savingSection === section.title}
                className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {savingSection === section.title ? "שומר..." : "שמור"}
              </button>
            </div>

            <div className="space-y-4">
              {section.keys.map((field) => (
                <div key={field.key}>
                  {field.type === "toggle" ? (
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {field.label}
                      </label>
                      <button
                        onClick={() =>
                          updateSetting(field.key, !settings[field.key])
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings[field.key] ? "bg-primary-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings[field.key]
                              ? "translate-x-1.5"
                              : "translate-x-6"
                          }`}
                        />
                      </button>
                    </div>
                  ) : field.type === "textarea" ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <textarea
                        value={(settings[field.key] as string) || ""}
                        onChange={(e) => updateSetting(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={(settings[field.key] as string | number) ?? ""}
                        onChange={(e) =>
                          updateSetting(
                            field.key,
                            field.type === "number"
                              ? Number(e.target.value)
                              : e.target.value
                          )
                        }
                        placeholder={field.placeholder}
                        className="w-full sm:w-80 rounded-lg border-gray-200 border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        dir={field.type === "text" ? "ltr" : undefined}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Backup history */}
            {section.title === "גיבוי" && <BackupPanel />}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

function BackupPanel({ limit = 5, showArchiveLink = true }: { limit?: number; showArchiveLink?: boolean }) {
  const [backups, setBackups] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [elapsed, setElapsed] = useState(0);
  const [autoEnabled, setAutoEnabled] = useState<boolean | null>(null);

  useEffect(() => { load(); loadFlag(); }, []);

  async function loadFlag() {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const d = await res.json();
      const v = d?.settings?.backup_enabled;
      setAutoEnabled(v === true || v === "true");
    } catch { setAutoEnabled(false); }
  }

  function nextRunText() {
    const now = new Date();
    const next = new Date();
    next.setHours(2, 0, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    return next.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
  }

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/backups?limit=${limit === Infinity ? 200 : 200}`, { cache: "no-store" });
      const d = await res.json();
      const all = d.backups || [];
      setTotalCount(all.length);
      setBackups(limit === Infinity ? all : all.slice(0, limit));
    } finally { setLoading(false); }
    loadFlag();
  }

  async function runNow() {
    setRunning(true);
    setElapsed(0);
    setStatus("מתחיל גיבוי...");
    try {
      setStatus("מוריד נתונים מכל הטבלאות + מעלה ל-Storage...");
      const res = await fetch("/api/admin/backups", { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        setStatus(`✓ הושלם: ${d.tables} טבלאות, ${d.rows} רשומות, ${fmtSize(d.size)}`);
        load();
      } else {
        setStatus(`✗ שגיאה: ${d.error || "unknown"}`);
      }
    } catch (e: any) {
      setStatus(`✗ שגיאה: ${e.message}`);
    } finally {
      setRunning(false);
      setTimeout(() => setStatus(""), 8000);
    }
  }

  async function del(id: string) {
    if (!confirm("למחוק את הגיבוי הזה?")) return;
    await fetch(`/api/admin/backups/${id}`, { method: "DELETE" });
    load();
  }

  function fmtSize(bytes: number) {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function fmtDate(s: string) {
    return new Date(s).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <div className="mt-4 pt-4 border-t">
      {/* Status banner */}
      {autoEnabled !== null && (
        <div className={`mb-3 rounded-lg p-3 text-sm border flex items-center justify-between gap-2 flex-wrap ${
          autoEnabled ? "bg-green-50 border-green-200 text-green-900" : "bg-gray-50 border-gray-200 text-gray-700"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${autoEnabled ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {autoEnabled ? (
              <span>✅ <strong>גיבוי אוטומטי פעיל</strong> · הרצה הבאה: {nextRunText()} (02:00)</span>
            ) : (
              <span>⏸️ <strong>גיבוי אוטומטי כבוי</strong> · אין הרצה מתוזמנת — הפעל את המתג למעלה כדי להתחיל</span>
            )}
          </div>
          <div className="text-xs opacity-75">תיזמון cron: <code dir="ltr">0 2 * * *</code></div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h4 className="text-sm font-medium text-gray-600">היסטוריית גיבויים</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={runNow}
            disabled={running}
            className="bg-primary-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-primary-800 disabled:opacity-50"
          >
            {running ? `⏳ ${elapsed}s...` : "▶️ הרץ גיבוי עכשיו"}
          </button>
        </div>
      </div>

      {status && (
        <div className={`mb-3 text-xs px-3 py-2 rounded-lg border ${
          status.startsWith("✓") ? "bg-green-50 border-green-200 text-green-800" :
          status.startsWith("✗") ? "bg-red-50 border-red-200 text-red-800" :
          "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          {running && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-2" />}
          {status}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-6">טוען...</div>
      ) : backups.length === 0 ? (
        <div className="text-center text-gray-400 py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          אין גיבויים עדיין — לחץ "הרץ גיבוי עכשיו" כדי ליצור אחד
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="text-right p-2">תאריך</th>
                <th className="text-right p-2">מקור</th>
                <th className="text-right p-2">סטטוס</th>
                <th className="text-right p-2">טבלאות</th>
                <th className="text-right p-2">רשומות</th>
                <th className="text-right p-2">גודל</th>
                <th className="text-right p-2">זמן</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} className="border-b border-gray-100">
                  <td className="p-2 text-gray-700">{fmtDate(b.created_at)}</td>
                  <td className="p-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {b.trigger === "auto" ? "אוטומטי" : "ידני"}
                    </span>
                  </td>
                  <td className="p-2">
                    {b.status === "success" ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">✓ הצלחה</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded" title={b.error_msg}>✗ כשל</span>
                    )}
                  </td>
                  <td className="p-2 text-gray-700">{b.tables_count ?? "-"}</td>
                  <td className="p-2 text-gray-700">{b.rows_count ?? "-"}</td>
                  <td className="p-2 text-gray-700">{fmtSize(b.size_bytes)}</td>
                  <td className="p-2 text-gray-500 text-xs">{b.duration_ms ? `${(b.duration_ms / 1000).toFixed(1)}s` : "-"}</td>
                  <td className="p-2 text-left">
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
          <p className="text-xs text-gray-400 mt-2">💡 שומר 30 גיבויים אחרונים · גיבוי אוטומטי רץ כל יום ב-3:00 אם מופעל</p>
          {showArchiveLink && totalCount > limit && (
            <div className="mt-3 text-center">
              <a href="/settings/backups" className="text-sm text-primary-700 hover:underline">
                צפה בכל הגיבויים ({totalCount}) ←
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
