"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Page = {
  id: string;
  slug: string;
  title: string;
  html: string;
  is_active: boolean;
  main_artist: string | null;
  guest_artist: string | null;
  event_date: string | null;
  city: string | null;
  country: string | null;
  venue_name: string | null;
  ticket_purchase_link: string | null;
  intro_text: string | null;
  cover_image_url: string | null;
  wa_message_template: string | null;
};

const DEFAULT_WA_TEMPLATE = `שלום {{first_name}},

תודה שהתעניינת ברכישת כרטיס לאירוע {{title}}!

ניתן לרכוש את הכרטיס בקישור הבא:
{{ticket_link}}

נתראה באירוע 🎉`;

export default function MarketingPageEdit({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r1 = await fetch(`/api/admin/marketing/pages/${params.id}`, { cache: "no-store" }).then((r) => r.json());
    if (r1.page) setPage(r1.page);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!page) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/pages/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: page.title,
          slug: page.slug,
          html: page.html,
          is_active: page.is_active,
          main_artist: page.main_artist,
          guest_artist: page.guest_artist,
          event_date: page.event_date,
          city: page.city,
          country: page.country,
          venue_name: page.venue_name,
          ticket_purchase_link: page.ticket_purchase_link,
          intro_text: page.intro_text,
          wa_message_template: page.wa_message_template,
        }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "שגיאה בשמירה"); return; }
      setPage(d.page);
      alert("נשמר ✓");
    } finally { setSaving(false); }
  }

  async function uploadCover(file: File) {
    if (!page) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/marketing/pages/${params.id}/cover`, { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "שגיאה בהעלאה"); return; }
      setPage({ ...page, cover_image_url: d.cover_image_url });
    } finally { setUploading(false); }
  }

  async function removeCover() {
    if (!page || !confirm("להסיר את תמונת הרקע?")) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/admin/marketing/pages/${params.id}/cover`, { method: "DELETE" });
      if (!res.ok) { alert("שגיאה"); return; }
      setPage({ ...page, cover_image_url: null });
    } finally { setUploading(false); }
  }

  async function remove() {
    if (!confirm("למחוק את העמוד? כל הלידים יימחקו גם.")) return;
    const res = await fetch(`/api/admin/marketing/pages/${params.id}`, { method: "DELETE" });
    if (!res.ok) { alert("שגיאה במחיקה"); return; }
    router.push("/marketing/pages");
  }

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!page) return <div className="text-center py-12 text-gray-400">העמוד לא נמצא</div>;

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-2 flex items-center gap-1 mb-4 overflow-x-auto">
        <Link href={`/marketing/pages/${params.id}/dashboard`} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">📊 דשבורד</Link>
        <Link href={`/marketing/pages/${params.id}/leads`} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">📋 לידים</Link>
        <Link href={`/marketing/pages/${params.id}/links`} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">🔗 קישורי מעקב</Link>
        <span className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-700 text-white whitespace-nowrap">✏️ עריכה</span>
        <button onClick={load} className="ms-auto text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 inline-flex items-center gap-1" title="רענן נתונים">
          🔄 רענן
        </button>
      </div>

      <div className="space-y-4">
          {/* Status + actions */}
          <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={page.is_active} onChange={(e) => setPage({ ...page, is_active: e.target.checked })} className="w-4 h-4" />
              <span className="font-medium text-gray-700">העמוד פעיל</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              <a href={`/m/${page.slug}`} target="_blank" rel="noopener noreferrer"
                className="text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200">
                👁 תצוגה חיה
              </a>
              <button onClick={save} disabled={saving} className="text-sm bg-primary-700 text-white px-5 py-2 rounded hover:bg-primary-800 disabled:opacity-50">
                {saving ? "שומר..." : "💾 שמור"}
              </button>
              <button onClick={remove} className="text-sm bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200">🗑 מחק</button>
            </div>
          </div>

          {/* Basic */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">📌 פרטים בסיסיים</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="כותרת*" value={page.title} onChange={(v) => setPage({ ...page, title: v })} />
              <Field label="slug (כתובת)*" value={page.slug} onChange={(v) => setPage({ ...page, slug: v })} mono />
            </div>
            <Field label="טקסט פתיחה (intro)" textarea value={page.intro_text || ""} onChange={(v) => setPage({ ...page, intro_text: v })} />
          </div>

          {/* Event */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">🎤 פרטי האירוע</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="אמן ראשי" value={page.main_artist || ""} onChange={(v) => setPage({ ...page, main_artist: v })} />
              <Field label="אמן אורח" value={page.guest_artist || ""} onChange={(v) => setPage({ ...page, guest_artist: v })} />
              <Field label="תאריך" type="date" value={page.event_date || ""} onChange={(v) => setPage({ ...page, event_date: v })} />
              <Field label="שם המקום" value={page.venue_name || ""} onChange={(v) => setPage({ ...page, venue_name: v })} />
              <Field label="עיר" value={page.city || ""} onChange={(v) => setPage({ ...page, city: v })} />
              <Field label="מדינה" value={page.country || ""} onChange={(v) => setPage({ ...page, country: v })} />
            </div>
            <div>
              <Field label="קישור לרכישת כרטיס (יישלח בWhatsApp + מייל)" value={page.ticket_purchase_link || ""} onChange={(v) => setPage({ ...page, ticket_purchase_link: v })} mono />
              {page.ticket_purchase_link && (page.ticket_purchase_link.includes("/m/") || page.ticket_purchase_link.includes("?ref=")) && (
                <p className="text-xs text-red-600 mt-1.5">
                  ⚠️ זה נראה כמו קישור מעקב לטופס שלך, לא קישור רכישה חיצוני. הכנס כאן URL של אתר הכרטיסים (למשל eventim.co.il)
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">דוגמה: <code className="bg-gray-100 px-1">https://www.eventim.co.il/he/event/123</code></p>
            </div>
          </div>

          {/* Cover image */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">🖼 תמונת רקע (Hero)</h3>
            {page.cover_image_url ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.cover_image_url} alt="cover" className="w-full max-h-64 object-cover rounded-lg border border-gray-200" />
                <div className="flex gap-2">
                  <label className={`text-xs bg-primary-700 text-white px-3 py-1.5 rounded hover:bg-primary-800 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                    {uploading ? "מעלה..." : "🔄 החלף"}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                  </label>
                  <button onClick={removeCover} disabled={uploading}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 disabled:opacity-50">
                    🗑 הסר
                  </button>
                </div>
              </div>
            ) : (
              <label className={`block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50/30 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="text-3xl mb-2">📤</div>
                <div className="text-sm font-medium text-gray-700">{uploading ? "מעלה..." : "העלה תמונת רקע"}</div>
                <div className="text-xs text-gray-500 mt-1">PNG / JPG / WEBP / GIF · עד 10MB</div>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
              </label>
            )}
            <p className="text-xs text-gray-500">התמונה תוצג כרקע בעמוד הציבורי, מתחת לכותרת ולשם האמן. רוחב מומלץ: 1200px+, יחס 3:4 או 16:9.</p>
          </div>

          {/* WhatsApp template */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-gray-800">💬 הודעת WhatsApp לרוכשי כרטיסים</h3>
              <button
                type="button"
                onClick={() => setPage({ ...page, wa_message_template: DEFAULT_WA_TEMPLATE })}
                className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
              >
                שחזר ברירת מחדל
              </button>
            </div>
            <p className="text-xs text-gray-500">
              נשלחת אוטומטית למי שבוחר "רכישת כרטיס בלבד". משתנים זמינים:{" "}
              <code className="bg-gray-100 px-1">{`{{first_name}}`}</code>,{" "}
              <code className="bg-gray-100 px-1">{`{{last_name}}`}</code>,{" "}
              <code className="bg-gray-100 px-1">{`{{title}}`}</code>,{" "}
              <code className="bg-gray-100 px-1">{`{{ticket_link}}`}</code>
            </p>
            <textarea
              value={page.wa_message_template ?? DEFAULT_WA_TEMPLATE}
              onChange={(e) => setPage({ ...page, wa_message_template: e.target.value })}
              rows={9}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm font-mono outline-none focus:border-primary-500"
              placeholder={DEFAULT_WA_TEMPLATE}
              spellCheck={false}
            />
            <details className="text-xs">
              <summary className="cursor-pointer text-primary-700 hover:underline">תצוגה מקדימה (דוגמה)</summary>
              <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 whitespace-pre-line text-sm">
                {(page.wa_message_template ?? DEFAULT_WA_TEMPLATE)
                  .replace(/\{\{\s*first_name\s*\}\}/g, "ישראל")
                  .replace(/\{\{\s*last_name\s*\}\}/g, "ישראלי")
                  .replace(/\{\{\s*title\s*\}\}/g, page.title || "האירוע")
                  .replace(/\{\{\s*ticket_link\s*\}\}/g, page.ticket_purchase_link || "https://example.com/buy")}
              </div>
            </details>
          </div>

          {/* Custom HTML */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-gray-800">🎨 HTML מותאם אישית</h3>
            <p className="text-xs text-gray-500">
              ה-HTML הזה מוצג מעל הטופס. ניתן להשתמש במשתנים: <code className="bg-gray-100 px-1">{`{{title}}`}</code>, <code className="bg-gray-100 px-1">{`{{main_artist}}`}</code>, <code className="bg-gray-100 px-1">{`{{guest_artist}}`}</code>, <code className="bg-gray-100 px-1">{`{{event_date}}`}</code>, <code className="bg-gray-100 px-1">{`{{city}}`}</code>, <code className="bg-gray-100 px-1">{`{{venue_name}}`}</code>, <code className="bg-gray-100 px-1">{`{{intro_text}}`}</code>
            </p>
            <textarea
              value={page.html}
              onChange={(e) => setPage({ ...page, html: e.target.value })}
              className="w-full h-72 border border-gray-200 rounded-lg p-3 text-sm font-mono outline-none focus:border-primary-500"
              placeholder="<div class='hero'>...</div>"
              spellCheck={false}
              dir="ltr"
            />
          </div>
        </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", mono = false, textarea = false,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; mono?: boolean; textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700 block mb-1">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 ${mono ? "font-mono" : ""}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 ${mono ? "font-mono" : ""}`}
        />
      )}
    </label>
  );
}
