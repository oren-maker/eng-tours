"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const tabs = [
  { href: "/marketing", label: "📢 ראשי", match: (p: string) => p === "/marketing" },
  { href: "/marketing/pages", label: "📄 עמודי שיווק", match: (p: string) => p.startsWith("/marketing/pages") },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";

  // When viewing a specific page (/marketing/pages/[id]/...), pull its title
  // so the back-arrow + title can appear before the main tabs.
  const detailMatch = pathname.match(/^\/marketing\/pages\/([0-9a-f-]{36})(?:\/|$)/);
  const pageId = detailMatch?.[1];
  const [pageTitle, setPageTitle] = useState<string>("");

  useEffect(() => {
    if (!pageId) { setPageTitle(""); return; }
    let cancelled = false;
    fetch(`/api/admin/marketing/pages/${pageId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setPageTitle(d?.page?.title || ""); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pageId]);

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-2 flex items-center gap-1 mb-4 overflow-x-auto">
        {pageId && pageTitle && (
          <>
            <Link
              href="/marketing/pages"
              className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-50 whitespace-nowrap inline-flex items-center gap-1.5"
              title="חזור לרשימה"
            >
              <span className="text-gray-400">←</span> {pageTitle}
            </Link>
            <span className="border-r border-gray-200 h-6 mx-1" />
          </>
        )}
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
