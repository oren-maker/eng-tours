"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Page = {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
  main_artist?: string | null;
  guest_artist?: string | null;
  event_date?: string | null;
  city?: string | null;
  leads_count: number;
  created_at: string;
};

export default function MarketingPagesList() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/marketing/pages").then((r) => r.json());
    setPages(r.pages || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/marketing/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "שגיאה"); return; }
      setNewTitle("");
      await load();
      window.location.href = `/marketing/pages/${d.page.id}`;
    } finally { setCreating(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-2xl font-bold text-primary-900">📄 עמודי שיווק</h2>
        <p className="text-sm text-gray-500 flex-1 min-w-0">דפי נחיתה לאיסוף לידים — כל עמוד עם כתובת משלו</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="שם העמוד החדש (למשל: NEWORLD Athens)"
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none"
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <button
            onClick={create}
            disabled={creating || !newTitle.trim()}
            className="bg-primary-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50"
          >
            + עמוד חדש
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-12 text-gray-400">טוען...</div>
      ) : pages.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📄</div>
          <p className="text-lg">אין עמודי שיווק עדיין</p>
          <p className="text-xs text-gray-500 mt-2">צור עמוד ראשון בטופס למעלה</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-800">{p.title}</h3>
                    {p.is_active ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">פעיל</span>
                    ) : (
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">כבוי</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-mono">/m/{p.slug}</span>
                    {p.main_artist && <span>· 🎤 {p.main_artist}{p.guest_artist ? ` × ${p.guest_artist}` : ""}</span>}
                    {p.event_date && <span>· 📅 {new Date(p.event_date).toLocaleDateString("he-IL")}</span>}
                    {p.city && <span>· 📍 {p.city}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <a
                    href={`/m/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200"
                  >
                    👁 תצוגה
                  </a>
                  <Link
                    href={`/marketing/pages/${p.id}`}
                    className="text-xs bg-primary-700 text-white px-3 py-1.5 rounded hover:bg-primary-800"
                  >
                    ✏️ ערוך · {p.leads_count} לידים
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
