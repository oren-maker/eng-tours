"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Tab = "terms" | "privacy";

interface Doc {
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/^### (.*)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2 class="text-lg font-bold mt-4 mb-2 text-primary-900">$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-3 text-primary-900">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.*)$/gm, '<li class="mr-4">$1</li>');
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, (m) => `<ul class="list-disc list-inside my-2 space-y-1">${m}</ul>`);
  html = html.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) =>
    /^<(h\d|ul|ol|blockquote)/.test(p) ? p : `<p class="my-2 leading-relaxed">${p.replace(/\n/g, "<br/>")}</p>`
  ).join("\n");
  return html;
}

export default function LegalSettingsPage() {
  const [tab, setTab] = useState<Tab>("terms");
  const [doc, setDoc] = useState<Doc | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => { load(tab); }, [tab]);

  async function load(slug: Tab) {
    setLoading(true);
    try {
      const res = await fetch(`/api/legal/${slug}`, { cache: "no-store" });
      const d = await res.json();
      setDoc(d); setContent(d.content || ""); setTitle(d.title || "");
    } finally { setLoading(false); }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/legal/${tab}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (res.ok) {
        setJustSaved(true); setTimeout(() => setJustSaved(false), 2500);
        load(tab);
      } else {
        const d = await res.json();
        alert(d.error || "שגיאה");
      }
    } finally { setSaving(false); }
  }

  async function resetToDefault() {
    if (!confirm("לשחזר את ברירת המחדל? כל השינויים יאבדו.")) return;
    const res = await fetch("/api/legal/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: tab }),
    });
    if (res.ok) load(tab); else alert("שגיאה");
  }

  return (
    <div>
      <Link href="/settings" className="text-sm text-primary-700 hover:underline mb-2 inline-block">← חזרה להגדרות</Link>
      <h2 className="text-2xl font-bold text-primary-900 mb-1">📜 מסמכים משפטיים</h2>
      <p className="text-sm text-gray-500 mb-6">עריכת תנאי השימוש ומדיניות הפרטיות המוצגים בטופס ההזמנה.</p>

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {([
          { key: "terms", label: "📄 תנאי שימוש" },
          { key: "privacy", label: "🔒 מדיניות פרטיות" },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? "border-b-2 border-primary-700 text-primary-700" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">טוען...</div> : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <label className="block text-sm font-medium text-gray-700">כותרת</label>
              <div className="text-xs text-gray-500">
                עודכן: {doc && new Date(doc.updated_at).toLocaleString("he-IL")}
              </div>
            </div>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none mb-4" />

            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">תוכן (תומך Markdown)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowPreview(!showPreview)}
                  className="text-xs border border-gray-200 px-3 py-1 rounded hover:bg-gray-50">
                  {showPreview ? "✏️ חזור לעריכה" : "👁️ תצוגה מקדימה"}
                </button>
                <a href={`/${tab}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs border border-gray-200 px-3 py-1 rounded hover:bg-gray-50">
                  🔗 פתח דף ציבורי
                </a>
              </div>
            </div>

            {showPreview ? (
              <div className="border border-gray-200 rounded-lg p-5 min-h-[400px] bg-gray-50 prose prose-sm max-w-none text-right"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            ) : (
              <textarea value={content} onChange={(e) => setContent(e.target.value)}
                rows={28}
                dir="rtl"
                className="w-full border border-gray-200 rounded-lg p-3 text-sm font-mono leading-relaxed focus:border-primary-500 outline-none" />
            )}

            <p className="text-xs text-gray-500 mt-2">
              💡 סינטקס: <code># כותרת</code>, <code>## כותרת משנה</code>, <code>**מודגש**</code>, <code>*נטוי*</code>, <code>- פריט רשימה</code>
            </p>

            <div className="flex gap-2 mt-4">
              <button onClick={save} disabled={saving}
                className="bg-primary-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50">
                {saving ? "שומר..." : "💾 שמור"}
              </button>
              {justSaved && <span className="text-sm text-green-700 self-center">✓ נשמר בהצלחה</span>}
              <button onClick={resetToDefault} className="mr-auto text-xs text-red-600 hover:text-red-800 border border-red-200 px-3 py-1 rounded hover:bg-red-50">
                🔄 שחזר ברירת מחדל
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
