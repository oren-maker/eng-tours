"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "דשבורד", icon: "📊" },
  { href: "/events", label: "אירועים", icon: "🎪" },
  { href: "/flights", label: "טיסות", icon: "✈️" },
  { href: "/hotels", label: "מלונות וחדרים", icon: "🏨" },
  { href: "/tickets", label: "כרטיסים", icon: "🎫" },
  { href: "/packages", label: "חבילות", icon: "📦" },
  { href: "/orders", label: "הזמנות", icon: "📋" },
  { href: "/waiting-list", label: "רשימת המתנה", icon: "⏳" },
  { href: "/coupons", label: "קופונים", icon: "🏷️" },
  { href: "/financial", label: "כלכלי", icon: "💰" },
  { href: "/faq", label: "FAQ", icon: "❓" },
  { href: "/users", label: "משתמשים", icon: "👥" },
  { href: "/whatsapp", label: "WhatsApp", icon: "💬" },
  { href: "/settings", label: "הגדרות", icon: "⚙️" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 right-0 bottom-0 w-60 bg-primary-700 text-white flex-col z-50 shadow-lg">
        <div className="p-5 border-b border-white/15 text-center">
          <h1 className="text-xl font-bold">ENG Tours</h1>
          <p className="text-xs text-white/60 mt-1">מערכת ניהול אירועים</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/20 text-white font-semibold"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-lg w-7 text-center flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/15 text-center">
          <p className="text-xs text-white/50">ENG Tours v1.0</p>
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-primary-700 text-white flex justify-around items-center h-16 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-all ${
                isActive ? "text-white font-semibold" : "text-white/60"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
