"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Page = {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
  archived_at: string | null;
  main_artist?: string | null;
  guest_artist?: string | null;
  event_date?: string | null;
  event_end_date?: string | null;
  city?: string | null;
  leads_count: number;
  affiliates_count: number;
  created_at: string;
};

export default function MarketingPagesList() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [view, setView] = useState<"active" | "archive">("active");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/marketing/pages", { cache: "no-store" }).then((r) => r.json());
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
      window.location.href = `/marketing/pages/${d.page.id}`;
    } finally { setCreating(false); }
  }

  async function toggleArchive(id: string, currentlyArchived: boolean) {
    const verb = currentlyArchived ? "לשחזר" : "להעביר לארכיון";
    if (!confirm(`${verb} את העמוד?`)) return;
    const res = await fetch(`/api/admin/marketing/pages/${id}/archive`, { method: "POST" });
    if (!res.ok) { alert("שגיאה"); return; }
    await load();
  }

  const active = pages.filter((p) => !p.archived_at);
  const archived = pages.filter((p) => p.archived_at);
  const list = view === "active" ? active : archived;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-2xl font-bold text-primary-900">📄 עמודי שיווק</h2>
        <p className="text-sm text-gray-500">דפי נחיתה לאיסוף לידים — כל עמוד עם כתובת משלו</p>
      </div>

      {/* Active/Archive sub-tabs */}
      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-1 mb-4">
        <button
          onClick={() => setView("active")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === "active" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          פעילים ({active.length})
        </button>
        <button
          onClick={() => setView("archive")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === "archive" ? "bg-gray-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          📦 ארכיון ({archived.length})
        </button>
      </div>

      {view === "active" && (
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
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-12 text-gray-400">טוען...</div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">{view === "active" ? "📄" : "📦"}</div>
          <p className="text-lg">{view === "active" ? "אין עמודי שיווק עדיין" : "אין עמודים בארכיון"}</p>
          {view === "active" && <p className="text-xs text-gray-500 mt-2">צור עמוד ראשון בטופס למעלה</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-800">{p.title}</h3>
                    {p.archived_at ? (
                      <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">בארכיון</span>
                    ) : p.is_active ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">פעיל</span>
                    ) : (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">כבוי</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                    <a href={`/m/${p.slug}`} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-primary-700">/m/{p.slug}</a>
                    {p.main_artist && <span>· 🎤 {p.main_artist}{p.guest_artist ? ` × ${p.guest_artist}` : ""}</span>}
                    {p.event_date && (
                      <span>· 📅 {new Date(p.event_date).toLocaleDateString("he-IL")}
                        {p.event_end_date && p.event_end_date !== p.event_date && ` – ${new Date(p.event_end_date).toLocaleDateString("he-IL")}`}
                      </span>
                    )}
                    {p.city && <span>· 📍 {p.city}</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-3">
                    <span>📋 <b className="text-gray-700">{p.leads_count}</b> לידים</span>
                    <span>🔗 <b className="text-gray-700">{p.affiliates_count}</b> קישורי מעקב</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link
                    href={`/marketing/pages/${p.id}/dashboard`}
                    className="text-xs bg-primary-700 text-white px-3 py-1.5 rounded hover:bg-primary-800"
                    title="דשבורד עם כל הנתונים"
                  >
                    📊 דשבורד
                  </Link>
                  <Link
                    href={`/marketing/pages/${p.id}/links`}
                    className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700"
                    title="קישורי מעקב"
                  >
                    🔗 קישורים
                  </Link>
                  <Link
                    href={`/marketing/pages/${p.id}`}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200"
                    title="עריכת תוכן"
                  >
                    ✏️ עריכה
                  </Link>
                  <button
                    onClick={() => toggleArchive(p.id, !!p.archived_at)}
                    className={`text-xs px-3 py-1.5 rounded ${p.archived_at ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}`}
                    title={p.archived_at ? "שחזור מהארכיון" : "העברה לארכיון"}
                  >
                    {p.archived_at ? "↩ שחזור" : "📦 ארכיון"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
