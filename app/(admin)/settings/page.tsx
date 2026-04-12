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
    <>
      <BackToSettings />
      <div>
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

            {/* Backup history placeholder */}
            {section.title === "גיבוי" && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-600 mb-2">
                  היסטוריית גיבויים
                </h4>
                <div className="text-center text-gray-400 py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  היסטוריית גיבויים תוצג כאן
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
