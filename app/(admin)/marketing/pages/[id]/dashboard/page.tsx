"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Page = {
  id: string; slug: string; title: string; archived_at: string | null;
  main_artist: string | null; guest_artist: string | null;
  event_date: string | null; city: string | null; venue_name: string | null;
};
type Lead = {
  id: string; first_name: string | null; last_name: string | null;
  phone: string | null; email: string | null;
  interest_type: string | null; whatsapp_status: string | null;
  affiliate_id: string | null; created_at: string;
};
type Affiliate = {
  id: string; name: string; tracking_code: string;
  clicks: number; leads_count: number;
};

export default function PageDashboard({ params }: { params: { id: string } }) {
  const [page, setPage] = useState<Page | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [r1, r2, r3] = await Promise.all([
      fetch(`/api/admin/marketing/pages/${params.id}`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/admin/marketing/pages/${params.id}/leads`, { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/admin/marketing/pages/${params.id}/affiliates`, { cache: "no-store" }).then((r) => r.json()),
    ]);
    if (r1.page) setPage(r1.page);
    setLeads(r2.leads || []);
    setAffiliates(r3.affiliates || []);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!page) return <div className="text-center py-12 text-gray-400">לא נמצא</div>;

  const ticketLeads = leads.filter((l) => l.interest_type === "ticket_purchase").length;
  const packageLeads = leads.filter((l) => l.interest_type === "package_inquiry").length;
  const waSent = leads.filter((l) => l.whatsapp_status === "sent").length;
  const waFailed = leads.filter((l) => l.whatsapp_status === "failed").length;
  const totalClicks = affiliates.reduce((s, a) => s + (a.clicks || 0), 0);
  const attributedLeads = leads.filter((l) => l.affiliate_id).length;
  const directLeads = leads.length - attributedLeads;

  return (
    <div>
      <Breadcrumbs id={params.id} title={page.title} active="dashboard" />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white rounded-xl shadow-sm p-5 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">{page.title}</h2>
          <div className="text-sm text-white/80 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {page.main_artist && <span>🎤 {page.main_artist}{page.guest_artist ? ` × ${page.guest_artist}` : ""}</span>}
            {page.event_date && <span>📅 {new Date(page.event_date).toLocaleDateString("he-IL")}</span>}
            {page.city && <span>📍 {page.city}{page.venue_name ? ` · ${page.venue_name}` : ""}</span>}
          </div>
          <a href={`/m/${page.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-white/70 hover:text-white mt-2 inline-block">/m/{page.slug} ↗</a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="סה״כ לידים" value={leads.length} color="border-primary-500" />
        <Stat label="🎫 רכישת כרטיס" value={ticketLeads} color="border-green-500" />
        <Stat label="📦 בקשת חבילה" value={packageLeads} color="border-blue-500" />
        <Stat label="👁 צפיות מקישור מעקב" value={totalClicks} color="border-purple-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="WhatsApp נשלחו" value={waSent} color="border-green-400" small />
        <Stat label="WhatsApp נכשלו" value={waFailed} color="border-red-400" small />
        <Stat label="לידים מיוחסים לקישור" value={attributedLeads} color="border-purple-400" small />
        <Stat label="לידים ישירים" value={directLeads} color="border-gray-400" small />
      </div>

      {/* Top affiliates */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-gray-800">🔗 ביצועי קישורי מעקב</h3>
          <Link href={`/marketing/pages/${params.id}/links`} className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700">
            ניהול קישורים
          </Link>
        </div>
        {affiliates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">אין קישורי מעקב — הוסף ב"ניהול קישורים"</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">שם</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">קוד</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">כניסות</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">לידים</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">המרה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...affiliates].sort((a, b) => b.leads_count - a.leads_count).map((a) => {
                  const conv = a.clicks > 0 ? Math.round((a.leads_count / a.clicks) * 100) : 0;
                  return (
                    <tr key={a.id}>
                      <td className="px-3 py-2 font-medium text-gray-800">{a.name}</td>
                      <td className="px-3 py-2 text-right"><span className="font-mono text-xs text-gray-500" dir="ltr">{a.tracking_code}</span></td>
                      <td className="px-3 py-2 text-gray-700">{a.clicks}</td>
                      <td className="px-3 py-2 text-gray-700 font-bold">{a.leads_count}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{a.clicks > 0 ? `${conv}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-gray-800">📋 לידים אחרונים</h3>
          <Link href={`/marketing/pages/${params.id}/leads`} className="text-xs text-primary-700 hover:underline">כל הלידים ←</Link>
        </div>
        {leads.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">אין לידים עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">תאריך</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">שם</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">טלפון</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">סוג</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">מקור</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.slice(0, 10).map((l) => {
                  const aff = affiliates.find((a) => a.id === l.affiliate_id);
                  return (
                    <tr key={l.id}>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString("he-IL")}</td>
                      <td className="px-3 py-2 text-xs">{l.first_name} {l.last_name}</td>
                      <td className="px-3 py-2 text-xs font-mono" dir="ltr">{l.phone || "—"}</td>
                      <td className="px-3 py-2 text-xs">{l.interest_type === "ticket_purchase" ? "🎫 כרטיס" : l.interest_type === "package_inquiry" ? "📦 חבילה" : "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{aff ? `🔗 ${aff.name}` : "ישיר"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {leads.length > 10 && <p className="text-xs text-gray-500 text-center mt-2">מציג 10 אחרונים מתוך {leads.length}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, small = false }: { label: string; value: number; color: string; small?: boolean }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 border-r-4 ${color}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`${small ? "text-xl" : "text-2xl"} font-bold text-gray-800 mt-1`}>{value}</div>
    </div>
  );
}

function Breadcrumbs({ id, title, active }: { id: string; title: string; active: "dashboard" | "leads" | "links" | "edit" }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 flex-wrap">
        <Link href="/marketing/pages" className="hover:text-primary-700">📄 עמודי שיווק</Link>
        <span>›</span>
        <span className="text-gray-700 font-medium">{title}</span>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-1 mb-4 overflow-x-auto">
        <Link href={`/marketing/pages/${id}/dashboard`} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${active === "dashboard" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}>📊 דשבורד</Link>
        <Link href={`/marketing/pages/${id}/leads`} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${active === "leads" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}>📋 לידים</Link>
        <Link href={`/marketing/pages/${id}/links`} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${active === "links" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}>🔗 קישורי מעקב</Link>
        <Link href={`/marketing/pages/${id}`} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${active === "edit" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}>✏️ עריכה</Link>
      </div>
    </div>
  );
}
