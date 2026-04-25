"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/marketing", label: "📢 ראשי", match: (p: string) => p === "/marketing" },
  { href: "/marketing/pages", label: "📄 עמודי שיווק", match: (p: string) => p.startsWith("/marketing/pages") },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-1 mb-4 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                active ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
