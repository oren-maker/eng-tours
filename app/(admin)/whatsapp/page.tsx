"use client";

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
  const [waNumber, setWaNumber] = useState("");
  const [waLink, setWaLink] = useState("");
  const [health, setHealth] = useState<{ online: boolean; error?: string } | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

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

  async function fetchHealth() {
    try {
      setHealthLoading(true);
      const res = await fetch("/api/whatsapp/health");
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ online: false, error: "Connection failed" });
    } finally {
      setHealthLoading(false);
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
      if (sendVars.trim()) {
        try {
          variables = JSON.parse(sendVars);
        } catch {
          setSendResult({ success: false, error: "JSON variables format invalid" });
          return;
        }
      }
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: sendNumber,
          templateName: sendTemplate || undefined,
          variables,
        }),
      });
      const data = await res.json();
      setSendResult(data);
      if (data.success) {
        setSendNumber("");
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
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
          <p className="text-sm text-gray-500">ניהול הודעות, תבניות וסטטוס</p>
        </div>

        {/* Health indicator */}
        <div className="flex items-center gap-2">
          {healthLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          ) : (
            <>
              <div
                className={`w-3 h-3 rounded-full ${
                  health?.online ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm text-gray-600">
                SIM {health?.online ? "מחובר" : "מנותק"}
              </span>
            </>
          )}
          <button
            onClick={fetchHealth}
            className="text-xs text-primary hover:underline mr-2"
          >
            רענן
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
      {activeTab === "connect" && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">חיבור מספר WhatsApp</h3>
          <p className="text-sm text-gray-500 mb-6">הכנס את מספר ה-WhatsApp של המערכת ליצירת QR Code לחיבור מהיר</p>

          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">מספר WhatsApp</label>
            <div className="flex gap-2 mb-4">
              <input
                type="tel"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                placeholder="972524802830"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                dir="ltr"
              />
              <button
                onClick={() => {
                  if (waNumber) {
                    const num = waNumber.replace(/[^0-9]/g, "");
                    setWaLink(`https://wa.me/${num}`);
                  }
                }}
                className="bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                צור QR Code
              </button>
            </div>
          </div>

          {waLink && (
            <div className="mt-6 flex flex-col items-center">
              <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
                <QRCode value={waLink} size={220} />
              </div>
              <p className="text-sm text-gray-600 mt-4 font-medium">סרוק את הקוד כדי לפתוח צ׳אט עם המספר</p>
              <p className="text-xs text-gray-400 mt-1 dir-ltr" dir="ltr">{waLink}</p>
              <div className="flex gap-2 mt-4">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                >
                  פתח ב-WhatsApp
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(waLink);
                    alert("הקישור הועתק!");
                  }}
                  className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  העתק קישור
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log tab */}
      {activeTab === "log" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">כיוון: הכל</option>
              <option value="outgoing">יוצאות</option>
              <option value="incoming">נכנסות</option>
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
                        {msg.direction === "outgoing" ? "יוצאת" : "נכנסת"}
                      </td>
                      <td className="p-3 font-mono text-xs">{msg.recipient}</td>
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

      {/* Templates tab */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-sm text-gray-400">
              אין תבניות
            </div>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
                  <button
                    onClick={() => {
                      setEditingTemplate(tpl);
                      setEditBody(tpl.body);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    עריכה
                  </button>
                </div>
                {editingTemplate?.id === tpl.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdateTemplate}
                        className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark"
                      >
                        שמור
                      </button>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                    {tpl.body}
                  </p>
                )}
                {tpl.variables?.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {tpl.variables.map((v) => (
                      <span
                        key={v}
                        className="px-2 py-0.5 bg-primary-50 text-primary text-xs rounded-full"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                משתנים (JSON)
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
  );
}
