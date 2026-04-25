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
};

type Lead = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  interest_type: string | null;
  whatsapp_status: string | null;
  whatsapp_sent_at: string | null;
  whatsapp_error: string | null;
  created_at: string;
};

const interestLabel: Record<string, string> = {
  package_inquiry: "📦 חבילה",
  ticket_purchase: "🎫 רכישה",
};

const waBadge: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-700", label: "⏳ ממתין" },
  sent: { color: "bg-green-100 text-green-700", label: "✓ נשלח" },
  failed: { color: "bg-red-100 text-red-700", label: "✗ נכשל" },
  not_required: { color: "bg-gray-100 text-gray-600", label: "—" },
};

export default function MarketingPageEdit({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [page, setPage] = useState<Page | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"edit" | "leads">("edit");

  const load = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch(`/api/admin/marketing/pages/${params.id}`).then((r) => r.json()),
      fetch(`/api/admin/marketing/pages/${params.id}/leads`).then((r) => r.json()),
    ]);
    if (r1.page) setPage(r1.page);
    setLeads(r2.leads || []);
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
        }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "שגיאה בשמירה"); return; }
      setPage(d.page);
      alert("נשמר ✓");
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm("למחוק את העמוד? כל הלידים יימחקו גם.")) return;
    const res = await fetch(`/api/admin/marketing/pages/${params.id}`, { method: "DELETE" });
    if (!res.ok) { alert("שגיאה במחיקה"); return; }
    router.push("/marketing/pages");
  }

  function exportLeadsCsv() {
    const headers = ["תאריך", "שם פרטי", "שם משפחה", "טלפון", "מייל", "סוג עניין", "סטטוס WA"];
    const rows = leads.map((l) => [
      new Date(l.created_at).toLocaleString("he-IL"),
      l.first_name || "",
      l.last_name || "",
      l.phone || "",
      l.email || "",
      interestLabel[l.interest_type || ""] || l.interest_type || "",
      l.whatsapp_status || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${page?.slug || params.id}.csv`;
    a.click();
  }

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!page) return <div className="text-center py-12 text-gray-400">העמוד לא נמצא</div>;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
        <Link href="/marketing/pages" className="hover:text-primary-700">📄 עמודי שיווק</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{page.title}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-1 mb-4 overflow-x-auto">
        <Link href={`/marketing/pages/${params.id}/dashboard`} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">📊 דשבורד</Link>
        <Link href={`/marketing/pages/${params.id}/links`} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">🔗 קישורי מעקב</Link>
        <span className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-700 text-white whitespace-nowrap">✏️ עריכה + לידים</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-1 mb-4">
        <button
          onClick={() => setView("edit")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${view === "edit" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          ✏️ עריכת העמוד
        </button>
        <button
          onClick={() => setView("leads")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${view === "leads" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}
        >
          📋 לידים ({leads.length})
        </button>
      </div>

      {view === "edit" && (
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
            <Field label="קישור לרכישת כרטיס (יישלח בwhatsApp)" value={page.ticket_purchase_link || ""} onChange={(v) => setPage({ ...page, ticket_purchase_link: v })} mono />
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
      )}

      {view === "leads" && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-wrap gap-2">
            <h3 className="font-semibold text-gray-800">📋 לידים שנכנסו ({leads.length})</h3>
            {leads.length > 0 && (
              <button onClick={exportLeadsCsv} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">
                📥 הורד CSV
              </button>
            )}
          </div>
          {leads.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p>אין לידים עדיין</p>
              <p className="text-xs mt-2">שלח את הקישור <code className="bg-gray-100 px-2 py-0.5 rounded">/m/{page.slug}</code> והלידים יופיעו כאן</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">תאריך</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">שם</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">טלפון</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">מייל</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">סוג</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">WA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((l) => {
                    const wa = waBadge[l.whatsapp_status || "not_required"] || waBadge.not_required;
                    return (
                      <tr key={l.id}>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString("he-IL")}</td>
                        <td className="px-3 py-2 text-xs">{l.first_name} {l.last_name}</td>
                        <td className="px-3 py-2 text-xs font-mono" dir="ltr">{l.phone || "—"}</td>
                        <td className="px-3 py-2 text-xs font-mono" dir="ltr">{l.email || "—"}</td>
                        <td className="px-3 py-2 text-xs">{interestLabel[l.interest_type || ""] || l.interest_type || "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${wa.color}`} title={l.whatsapp_error || ""}>{wa.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
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
