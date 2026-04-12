"use client";

import Link from "next/link";

const settingsItems = [
  {
    href: "/faq",
    label: "שאלות ותשובות",
    description: "ניהול שאלות ותשובות ללקוחות",
    icon: "❓",
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
  },
  {
    href: "/users",
    label: "משתמשים",
    description: "ניהול אדמינים וספקים",
    icon: "👥",
    color: "bg-green-50 border-green-200 hover:bg-green-100",
  },
  {
    href: "/whatsapp",
    label: "WhatsApp",
    description: "חיבור, תבניות ושליחת הודעות",
    icon: "💬",
    color: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
  },
  {
    href: "/audit-log",
    label: "יומן פעולות",
    description: "תיעוד כל הפעולות במערכת",
    icon: "📜",
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
  },
  {
    href: "/settings",
    label: "הגדרות מערכת",
    description: "הגדרות כלליות, תחזוקה, גיבוי",
    icon: "⚙️",
    color: "bg-gray-50 border-gray-200 hover:bg-gray-100",
  },
];

export default function SettingsHubPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-900">הגדרות כלליות</h2>
        <p className="text-sm text-gray-500 mt-1">בחר קטגוריה לניהול</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block bg-white rounded-xl shadow-sm border-2 ${item.color} p-6 transition-all hover:shadow-md`}
          >
            <div className="text-4xl mb-3">{item.icon}</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{item.label}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
