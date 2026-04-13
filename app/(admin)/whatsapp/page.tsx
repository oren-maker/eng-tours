"use client";

import BackToSettings from "@/components/back-to-settings";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

interface LogMessage {
  id: string;
  direction: string;
  recipient: string;
  recipient_type: string;
  template_name: string | null;
  message_body: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  variables: string[];
}

export default function WhatsAppAdminPage() {
  const [activeTab, setActiveTab] = useState<"log" | "templates" | "send" | "connect">("connect");
  const [health, setHealth] = useState<{ online: boolean; error?: string; sessions?: number; checked_at?: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthChecking, setHealthChecking] = useState(false);

  // Log state
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [filterDirection, setFilterDirection] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRecipientType, setFilterRecipientType] = useState("");

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editBody, setEditBody] = useState("");

  // Send state
  const [sendNumber, setSendNumber] = useState("");
  const [sendTemplate, setSendTemplate] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendVars, setSendVars] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetchHealth();
    fetchLog();
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchLog();
  }, [filterDirection, filterStatus, filterRecipientType]);

  async function fetchHealth(manual = false) {
    try {
      if (manual) setHealthChecking(true); else setHealthLoading(true);
      const res = await fetch(`/api/whatsapp/health${manual ? "?manual=1" : ""}`, { cache: "no-store" });
      const data = await res.json();
      setHealth(data);
      if (manual) fetchLog();
    } catch {
      setHealth({ online: false, error: "Connection failed" });
    } finally {
      setHealthLoading(false);
      setHealthChecking(false);
    }
  }

  async function fetchLog() {
    try {
      setLogLoading(true);
      const params = new URLSearchParams();
      if (filterDirection) params.set("direction", filterDirection);
      if (filterStatus) params.set("status", filterStatus);
      if (filterRecipientType) params.set("recipient_type", filterRecipientType);
      const res = await fetch(`/api/whatsapp/log?${params}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLogLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/whatsapp/templates");
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    }
  }

  async function handleUpdateTemplate() {
    if (!editingTemplate) return;
    try {
      const res = await fetch("/api/whatsapp/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTemplate.id, body: editBody }),
      });
      if (res.ok) {
        setEditingTemplate(null);
        fetchTemplates();
      }
    } catch {
      // Error handled silently
    }
  }

  async function handleSend() {
    try {
      setSending(true);
      setSendResult(null);
      let variables: Record<string, string> = {};
      if (sendTemplate && sendVars.trim()) {
        try {
          variables = JSON.parse(sendVars);
        } catch {
          setSendResult({ success: false, error: "פורמט המשתנים אינו JSON תקין" });
          return;
        }
      }
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: sendNumber,
          message: sendTemplate ? undefined : sendMessage,
          templateName: sendTemplate || undefined,
          variables,
        }),
      });
      const data = await res.json();
      setSendResult(data);
      if (data.success) {
        setSendNumber("");
        setSendMessage("");
        setSendTemplate("");
        setSendVars("");
        fetchLog();
      }
    } catch (err: any) {
      setSendResult({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  }

  function getStatusBadge(status: string) {
    const map: Record<string, string> = {
      sent: "bg-blue-100 text-blue-800",
      delivered: "bg-green-100 text-green-800",
      read: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  }

  const tabs = [
    { key: "connect", label: "חיבור WhatsApp" },
    { key: "log", label: "לוג הודעות" },
    { key: "templates", label: "תבניות" },
    { key: "send", label: "שליחה ידנית" },
  ] as const;

  return (
    <>
      <BackToSettings />
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
          <p className="text-sm text-gray-500">ניהול הודעות, תבניות וסטטוס</p>
        </div>

        {/* Health indicator */}
        <div className="flex items-center gap-3 flex-wrap">
          {healthLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          ) : (
            <>
              <div
                className={`w-3 h-3 rounded-full ${health?.online ? "bg-green-500" : "bg-red-500"} ${health?.online ? "animate-pulse" : ""}`}
              />
              <div className="text-sm">
                <div className="text-gray-700 font-medium">
                  WhatsApp {health?.online ? "מחובר" : "מנותק"}
                  {typeof health?.sessions === "number" && (
                    <span className="text-xs text-gray-500 mr-1">({health.sessions} חשבונות)</span>
                  )}
                </div>
                {health?.checked_at && (
                  <div className="text-[10px] text-gray-400">
                    נבדק: {new Date(health.checked_at).toLocaleString("he-IL")}
                  </div>
                )}
              </div>
            </>
          )}
          <button
            onClick={() => fetchHealth(true)}
            disabled={healthChecking}
            className="text-xs bg-primary-50 border border-primary-200 text-primary-700 hover:bg-primary-100 px-3 py-1.5 rounded disabled:opacity-50"
          >
            {healthChecking ? "בודק..." : "🩺 בדיקת בריאות"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Connect WhatsApp tab */}
      {activeTab === "connect" && <WaSenderConnect />}

      {/* Log tab */}
      {activeTab === "log" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <button onClick={fetchLog}
              className="bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-800">
              🔄 רענן
            </button>
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">כיוון: הכל</option>
              <option value="outgoing">יוצאות</option>
              <option value="incoming">נכנסות</option>
              <option value="system">מערכת</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">סטטוס: הכל</option>
              <option value="sent">נשלחה</option>
              <option value="delivered">הגיעה</option>
              <option value="read">נקראה</option>
              <option value="failed">נכשלה</option>
            </select>
            <select
              value={filterRecipientType}
              onChange={(e) => setFilterRecipientType(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">סוג נמען: הכל</option>
              <option value="customer">לקוח</option>
              <option value="supplier">ספק</option>
              <option value="admin">מנהל</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {logLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">
                אין הודעות
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-right p-3 font-medium text-gray-500">תאריך</th>
                    <th className="text-right p-3 font-medium text-gray-500">כיוון</th>
                    <th className="text-right p-3 font-medium text-gray-500">נמען</th>
                    <th className="text-right p-3 font-medium text-gray-500">תבנית</th>
                    <th className="text-right p-3 font-medium text-gray-500">סטטוס</th>
                    <th className="text-right p-3 font-medium text-gray-500">הודעה</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <tr
                      key={msg.id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="p-3 text-gray-600 whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleString("he-IL")}
                      </td>
                      <td className="p-3">
                        {msg.direction === "outgoing" ? "↗ יוצאת" : msg.direction === "incoming" ? "↙ נכנסת" : "⚙ מערכת"}
                      </td>
                      <td className="p-3 font-mono text-xs">{msg.recipient || (msg as any).recipient_number || "-"}</td>
                      <td className="p-3 text-gray-500">{msg.template_name || "-"}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                            msg.status
                          )}`}
                        >
                          {msg.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 max-w-xs truncate">
                        {msg.error_message || msg.message_body?.substring(0, 60)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Templates tab - redirects to dedicated page */}
      {activeTab === "templates" && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-3">📝</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">ניהול תבניות</h3>
          <p className="text-sm text-gray-500 mb-5">עריכת כל התבניות של הודעות WhatsApp עם תצוגה מקדימה</p>
          <a href="/whatsapp/templates" className="inline-block bg-primary-700 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary-800">
            פתח ניהול תבניות →
          </a>
        </div>
      )}

      {/* Send tab */}
      {activeTab === "send" && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 max-w-lg">
          <h3 className="font-semibold text-gray-900 mb-4">שליחה ידנית</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                מספר טלפון
              </label>
              <input
                type="text"
                value={sendNumber}
                onChange={(e) => setSendNumber(e.target.value)}
                placeholder="050-1234567"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                שם תבנית (אופציונלי)
              </label>
              <select
                value={sendTemplate}
                onChange={(e) => setSendTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">טקסט חופשי</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.name}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
            {sendTemplate ? (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  משתנים לתבנית (JSON)
                </label>
                <textarea
                  value={sendVars}
                  onChange={(e) => setSendVars(e.target.value)}
                  placeholder='{"name": "אורן", "order": "123"}'
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="ltr"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  תוכן ההודעה
                </label>
                <textarea
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  placeholder="שלום, מה שלומך?"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
            <button
              onClick={handleSend}
              disabled={!sendNumber.trim() || sending}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "שולח..." : "שלח הודעת WhatsApp"}
            </button>

            {sendResult && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  sendResult.success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {sendResult.success
                  ? "ההודעה נשלחה בהצלחה!"
                  : `שגיאה: ${sendResult.error}`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// ===================== WaSender Connect Component =====================

interface WaSession {
  id: string | number;
  name?: string;
  phone_number?: string;
  status?: string;
  account_protection?: boolean;
  log_messages?: boolean;
  webhook_url?: string;
  webhook_enabled?: boolean;
}

function WaSenderConnect() {
  const [sessions, setSessions] = useState<WaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newWebhook, setNewWebhook] = useState("");
  const [activeQr, setActiveQr] = useState<{ sessionId: string | number; qr: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  async function loadSessions() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/whatsapp/sessions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "שגיאה בטעינת חשבונות"); setSessions([]); }
      else setSessions(data.sessions || []);
    } catch (e: any) {
      setError(e.message || "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSessions(); }, []);

  async function handleCreate() {
    if (!newName.trim() || !newPhone.trim()) {
      alert("נא למלא שם ומספר טלפון");
      return;
    }
    setCreating(true);
    try {
      const digits = newPhone.replace(/[^0-9]/g, "");
      const e164 = "+" + digits;
      const res = await fetch("/api/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          phone_number: e164,
          webhook_url: newWebhook.trim() || undefined,
          webhook_enabled: !!newWebhook.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "שגיאה"); }
      else {
        setShowCreate(false); setNewName(""); setNewPhone(""); setNewWebhook("");
        loadSessions();
      }
    } catch (e: any) { alert(e.message); }
    finally { setCreating(false); }
  }

  async function handleConnect(s: WaSession) {
    setQrLoading(true);
    setActiveQr({ sessionId: s.id, qr: "" });
    try {
      const res = await fetch(`/api/whatsapp/sessions/${s.id}/connect`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "שגיאה"); setActiveQr(null); return; }
      const qr = data.qrCode || data.qr_code || data.qrcode || "";
      setActiveQr({ sessionId: s.id, qr });
      loadSessions();
    } catch (e: any) { alert(e.message); setActiveQr(null); }
    finally { setQrLoading(false); }
  }

  async function handleRefreshQr(sessionId: string | number) {
    setQrLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/sessions/${sessionId}/qr`, { method: "POST" });
      const data = await res.json();
      const qr = data.qrCode || data.qr_code || data.qrcode || "";
      setActiveQr({ sessionId, qr });
    } catch (e: any) { alert(e.message); }
    finally { setQrLoading(false); }
  }

  async function handleDisconnect(s: WaSession) {
    if (!confirm(`לנתק את ${s.name || s.phone_number}?`)) return;
    const res = await fetch(`/api/whatsapp/sessions/${s.id}/disconnect`, { method: "POST" });
    if (res.ok) loadSessions(); else alert("שגיאה");
  }

  async function handleDelete(s: WaSession) {
    if (!confirm(`למחוק את חשבון ${s.name || s.phone_number}? לא ניתן לשחזר.`)) return;
    const res = await fetch(`/api/whatsapp/sessions/${s.id}`, { method: "DELETE" });
    if (res.ok) loadSessions(); else { const d = await res.json(); alert(d.error || "שגיאה"); }
  }

  function statusBadge(status?: string) {
    const s = (status || "").toLowerCase();
    if (s === "connected" || s === "ready") return { cls: "bg-green-100 text-green-800", label: "✓ מחובר" };
    if (s === "scanning" || s === "qr" || s === "need_scan") return { cls: "bg-yellow-100 text-yellow-800", label: "⏳ ממתין לסריקה" };
    if (s === "disconnected" || s === "loggedout") return { cls: "bg-gray-100 text-gray-700", label: "מנותק" };
    return { cls: "bg-gray-100 text-gray-700", label: status || "—" };
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">חשבונות WhatsApp (WaSender)</h3>
            <p className="text-xs text-gray-500 mt-1">ניהול חשבונות, חיבור עם QR ושליחת הודעות דרך wasenderapi.com</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadSessions} className="border border-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">🔄 רענן</button>
            <button onClick={() => setShowCreate(!showCreate)} className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800">
              {showCreate ? "ביטול" : "+ חשבון חדש"}
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">שם החשבון</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="ENG TOURS Main" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">מספר טלפון</label>
              <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                placeholder="972524802830" dir="ltr"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Webhook URL (אופציונלי)</label>
              <input type="url" value={newWebhook} onChange={(e) => setNewWebhook(e.target.value)}
                placeholder="https://..." dir="ltr"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <button onClick={handleCreate} disabled={creating}
                className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {creating ? "יוצר..." : "💾 צור חשבון"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
            {error.includes("not configured") && (
              <div className="text-xs text-red-600 mt-1">הגדר את <code>WASENDER_API_KEY</code> ב-Vercel Environment Variables</div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-400">טוען חשבונות...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">
            אין חשבונות. צור חשבון חדש כדי להתחיל.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const sb = statusBadge(s.status);
              return (
                <div key={s.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📱</span>
                      <div>
                        <div className="font-semibold text-gray-800">{s.name || "חשבון ללא שם"}</div>
                        <div className="text-xs text-gray-500 font-mono" dir="ltr">{s.phone_number}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sb.cls}`}>{sb.label}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(!s.status || s.status === "disconnected" || s.status === "qr" || s.status === "scanning" || s.status === "need_scan") && (
                        <button onClick={() => handleConnect(s)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700">
                          🔌 חבר (סרוק QR)
                        </button>
                      )}
                      {(s.status === "connected" || s.status === "ready") && (
                        <button onClick={() => handleDisconnect(s)}
                          className="bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-700">
                          ⏏ נתק
                        </button>
                      )}
                      <button onClick={() => handleDelete(s)}
                        className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs hover:bg-red-100">
                        🗑 מחק
                      </button>
                    </div>
                  </div>

                  {activeQr?.sessionId === s.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center">
                      {qrLoading ? (
                        <div className="py-8 text-gray-400">טוען QR Code...</div>
                      ) : activeQr.qr ? (
                        <>
                          <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
                            {activeQr.qr.startsWith("data:image") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={activeQr.qr} alt="QR" width={220} height={220} />
                            ) : (
                              <QRCode value={activeQr.qr} size={220} />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-3">פתח WhatsApp בטלפון → הגדרות → מכשירים מקושרים → סרוק</p>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => handleRefreshQr(s.id)}
                              className="text-xs border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50">🔄 חדש QR</button>
                            <button onClick={() => { setActiveQr(null); loadSessions(); }}
                              className="text-xs bg-primary-700 text-white px-3 py-1.5 rounded hover:bg-primary-800">
                              ✓ סרקתי, רענן סטטוס
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="py-4 text-sm text-gray-500">לא התקבל QR. לחץ על &quot;חדש QR&quot;.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
