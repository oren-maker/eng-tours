"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Page = { id: string; slug: string; title: string };
type Lead = {
  id: string;
  first_name: string | null; last_name: string | null;
  phone: string | null; email: string | null;
  interest_type: string | null;
  whatsapp_status: string | null; whatsapp_sent_at: string | null;
  whatsapp_error: string | null;
  email_status: string | null; email_sent_at: string | null;
  email_error: string | null;
  affiliate_id: string | null;
  archived_at: string | null;
  handled: boolean;
  handled_at: string | null;
  created_at: string;
};
type Affiliate = { id: string; name: string };

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

export default function LeadsPage({ params }: { params: { id: string } }) {
  const [page, setPage] = useState<Page | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ticket_purchase" | "package_inquiry">("all");
  const [refFilter, setRefFilter] = useState<string>("all");
  const [view, setView] = useState<"active" | "archive">("active");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const aff = new URLSearchParams(window.location.search).get("aff");
    if (aff) setRefFilter(aff);
  }, []);

  const [errMsg, setErrMsg] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const fetchJson = async (url: string) => {
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(`${url}: ${res.status} ${data?.error || ""}`);
        return data;
      };
      const [r1, r2, r3] = await Promise.all([
        fetchJson(`/api/admin/marketing/pages/${params.id}`),
        fetchJson(`/api/admin/marketing/pages/${params.id}/leads`),
        fetchJson(`/api/admin/marketing/pages/${params.id}/affiliates`),
      ]);
      if (r1?.page) setPage(r1.page);
      setLeads(r2?.leads || []);
      setAffiliates(r3?.affiliates || []);
    } catch (e: any) {
      setErrMsg(e?.message || String(e));
      console.error("load error:", e);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const activeLeads = leads.filter((l) => !l.archived_at);
  const archivedLeads = leads.filter((l) => l.archived_at);
  const baseLeads = view === "active" ? activeLeads : archivedLeads;

  const filtered = baseLeads.filter((l) => {
    if (filter !== "all" && l.interest_type !== filter) return false;
    if (refFilter === "direct" && l.affiliate_id) return false;
    if (refFilter !== "all" && refFilter !== "direct" && l.affiliate_id !== refFilter) return false;
    return true;
  });

  async function patchLead(leadId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/marketing/pages/${params.id}/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) { alert("שגיאה"); return; }
    await load();
  }

  async function toggleHandled(lead: Lead) {
    await patchLead(lead.id, { handled: !lead.handled });
  }
  async function toggleArchive(lead: Lead) {
    const archive = !lead.archived_at;
    if (archive && !confirm("להעביר את הליד לארכיון?")) return;
    await patchLead(lead.id, { archive });
  }

  function exportCsv() {
    const headers = ["תאריך", "שם פרטי", "שם משפחה", "טלפון", "מייל", "סוג עניין", "סטטוס WA", "הגיע מ"];
    const rows = filtered.map((l) => {
      const aff = affiliates.find((a) => a.id === l.affiliate_id);
      return [
        new Date(l.created_at).toLocaleString("he-IL"),
        l.first_name || "", l.last_name || "",
        l.phone || "", l.email || "",
        interestLabel[l.interest_type || ""] || l.interest_type || "",
        l.whatsapp_status || "",
        aff?.name || "ישיר",
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${page?.slug || params.id}.csv`;
    a.click();
  }

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (!page) return <div className="text-center py-12 text-gray-400">לא נמצא</div>;

  return (
    <div>
      <PageTabs id={params.id} active="leads" onRefresh={load} />

      {errMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 mb-3 text-sm">
          ⚠ שגיאת טעינה: <code className="font-mono">{errMsg}</code>
          <button onClick={load} className="text-xs bg-red-700 text-white px-3 py-1 rounded mr-2 hover:bg-red-800">נסה שוב</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-2 flex gap-1 mb-3">
        <button onClick={() => setView("active")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === "active" ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
          📋 פעילים ({activeLeads.length})
        </button>
        <button onClick={() => setView("archive")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === "archive" ? "bg-gray-700 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
          📦 ארכיון ({archivedLeads.length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | "ticket_purchase" | "package_inquiry")}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-primary-500 outline-none">
            <option value="all">כל הסוגים</option>
            <option value="ticket_purchase">🎫 רכישת כרטיס</option>
            <option value="package_inquiry">📦 חבילה</option>
          </select>
          <select value={refFilter} onChange={(e) => setRefFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-primary-500 outline-none">
            <option value="all">כל המקורות</option>
            <option value="direct">ישיר</option>
            {affiliates.map((a) => <option key={a.id} value={a.id}>🔗 {a.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">סה״כ: <b className="text-primary-700">{filtered.length}</b></span>
          {filtered.length > 0 && (
            <button onClick={exportCsv} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">
              📥 הורד CSV
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">{view === "archive" ? "📦" : "📭"}</div>
            <p>{view === "archive" ? "אין לידים בארכיון" : (leads.length > 0 ? "אין לידים שמתאימים לסינון" : "אין לידים עדיין")}</p>
            {view === "active" && leads.length === 0 && (
              <p className="text-xs mt-2">שלח את הקישור <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">/m/{page.slug}</code> והלידים יופיעו כאן</p>
            )}
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
                  <th className="text-right px-3 py-2 font-medium text-gray-600">סטטוס</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">WA</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">Email</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600">מקור</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((l) => {
                  const wa = waBadge[l.whatsapp_status || "not_required"] || waBadge.not_required;
                  const em = waBadge[l.email_status || "not_required"] || waBadge.not_required;
                  const aff = affiliates.find((a) => a.id === l.affiliate_id);
                  return (
                    <tr key={l.id} className={`hover:bg-gray-50 ${l.handled ? "opacity-60" : ""}`}>
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{new Date(l.created_at).toLocaleString("he-IL")}</td>
                      <td className="px-3 py-2 text-xs">{l.first_name} {l.last_name}</td>
                      <td className="px-3 py-2 text-xs font-mono" dir="ltr">{l.phone || "—"}</td>
                      <td className="px-3 py-2 text-xs font-mono" dir="ltr">{l.email || "—"}</td>
                      <td className="px-3 py-2 text-xs">{interestLabel[l.interest_type || ""] || l.interest_type || "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        <button onClick={() => toggleHandled(l)}
                          className={`text-[11px] px-2 py-1 rounded-full border whitespace-nowrap ${l.handled ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100" : "bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"}`}
                          title={l.handled_at ? `סומן ב-${new Date(l.handled_at).toLocaleString("he-IL")}` : "לסמן כטופל"}>
                          {l.handled ? "✓ טופל" : "○ לא טופל"}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${wa.color}`} title={l.whatsapp_error || ""}>{wa.label}</span>
                        {l.whatsapp_sent_at && <div className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">{new Date(l.whatsapp_sent_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${em.color}`} title={l.email_error || ""}>{em.label}</span>
                        {l.email_sent_at && <div className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">{new Date(l.email_sent_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{aff ? `🔗 ${aff.name}` : "ישיר"}</td>
                      <td className="px-3 py-2 text-xs">
                        <button onClick={() => toggleArchive(l)}
                          className={`text-[11px] px-2 py-1 rounded whitespace-nowrap ${l.archived_at ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}`}
                          title={l.archived_at ? "שחזר מהארכיון" : "העבר לארכיון"}>
                          {l.archived_at ? "↩ שחזר" : "📦 ארכיון"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PageTabs({ id, active, onRefresh }: { id: string; active: "dashboard" | "leads" | "links" | "edit"; onRefresh?: () => void }) {
  const cls = (k: string) =>
    `px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${active === k ? "bg-primary-700 text-white" : "text-gray-600 hover:bg-gray-50"}`;
  return (
    <div className="bg-white rounded-xl shadow-sm p-2 flex items-center gap-1 mb-4 overflow-x-auto">
      <Link href={`/marketing/pages/${id}/dashboard`} className={cls("dashboard")}>📊 דשבורד</Link>
      <Link href={`/marketing/pages/${id}/leads`} className={cls("leads")}>📋 לידים</Link>
      <Link href={`/marketing/pages/${id}/links`} className={cls("links")}>🔗 קישורי מעקב</Link>
      <Link href={`/marketing/pages/${id}`} className={cls("edit")}>✏️ עריכה</Link>
      {onRefresh && (
        <button onClick={onRefresh} className="ms-auto text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 inline-flex items-center gap-1" title="רענן נתונים">
          🔄 רענן
        </button>
      )}
    </div>
  );
}
