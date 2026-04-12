"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  children?: { href: string; label: string; icon: string }[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "דשבורד", icon: "📊" },
  { href: "/events", label: "אירועים", icon: "🎪" },
  {
    href: "/packages",
    label: "חבילות",
    icon: "📦",
    children: [
      { href: "/packages", label: "חבילות", icon: "📦" },
      { href: "/airlines", label: "חברות תעופה", icon: "✈️" },
      { href: "/hotels", label: "מלונות וחדרים", icon: "🏨" },
      { href: "/tickets", label: "כרטיסים", icon: "🎫" },
    ],
  },
  { href: "/orders", label: "הזמנות", icon: "📋" },
  { href: "/financial", label: "כלכלי", icon: "💰" },
  {
    href: "/settings",
    label: "הגדרות כלליות",
    icon: "⚙️",
    children: [
      { href: "/faq", label: "שאלות ותשובות", icon: "❓" },
      { href: "/users", label: "משתמשים", icon: "👥" },
      { href: "/whatsapp", label: "WhatsApp", icon: "💬" },
      { href: "/audit-log", label: "יומן פעולות", icon: "📜" },
      { href: "/settings", label: "הגדרות", icon: "⚙️" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    // Auto-open the group that contains the current page
    return navItems
      .filter((item) => item.children?.some((child) => pathname?.startsWith(child.href)))
      .map((item) => item.href);
  });

  function toggleGroup(href: string) {
    setOpenGroups((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname?.startsWith(href + "/"));
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 right-0 bottom-0 w-56 bg-primary-700 text-white flex-col z-50 shadow-lg">
        <div className="p-4 border-b border-white/15 text-center">
          <h1 className="text-lg font-bold">ENG Tours</h1>
          <p className="text-[10px] text-white/50 mt-0.5">מערכת ניהול אירועים</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = openGroups.includes(item.href);
            const isGroupActive = hasChildren && item.children!.some((c) => isActive(c.href));

            if (!hasChildren) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? "bg-white/20 text-white font-semibold"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-base w-6 text-center flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleGroup(item.href)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isGroupActive
                      ? "bg-white/15 text-white font-semibold"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-base w-6 text-center flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 text-right">{item.label}</span>
                  <span className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
                </button>

                {isOpen && (
                  <div className="mr-4 mt-0.5 space-y-0.5 border-r border-white/10 pr-2">
                    {item.children!.map((child) => (
                      <Link
                        key={child.href + child.label}
                        href={child.href}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isActive(child.href)
                            ? "bg-white/20 text-white"
                            : "text-white/60 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="text-sm w-5 text-center flex-shrink-0">{child.icon}</span>
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/15 text-center">
          <p className="text-[10px] text-white/40">ENG Tours v1.0</p>
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary-700 text-white flex justify-around items-center h-14 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        {[
          { href: "/dashboard", label: "דשבורד", icon: "📊" },
          { href: "/events", label: "אירועים", icon: "🎪" },
          { href: "/orders", label: "הזמנות", icon: "📋" },
          { href: "/financial", label: "כלכלי", icon: "💰" },
          { href: "/settings", label: "הגדרות", icon: "⚙️" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-all ${
              isActive(item.href) ? "text-white font-semibold" : "text-white/60"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
