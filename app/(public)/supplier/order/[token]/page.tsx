"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Participant {
  id: string;
  first_name_en: string;
  last_name_en: string;
  passport_number: string;
  birth_date: string;
  phone: string;
  email: string;
  flights?: { airline_name?: string; flight_code?: string; origin_iata?: string; dest_iata?: string; departure_time?: string };
  rooms?: { room_type?: string; check_in?: string; check_out?: string; hotels?: { name?: string } };
  tickets?: { name?: string };
}

interface Item {
  id: string;
  type: "flight" | "room" | "ticket";
  name: string;
  details: string;
  participants: string[];
  confirmation_number: string;
  notes: string;
  has_issue: boolean;
  issue_description: string;
}

export default function SupplierOrderPage() {
  const params = useParams();
  const token = params.token as string;

  const [authenticated, setAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if admin is logged in via NextAuth session
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        if (session?.user?.role === "admin" || session?.user?.role === "supplier") {
          setAuthenticated(true);
          return;
        }
        // Fallback - check local supplier auth
        const stored = typeof window !== "undefined" ? localStorage.getItem("supplier_auth") : null;
        if (stored === "true") setAuthenticated(true);
      })
      .catch(() => {
        const stored = typeof window !== "undefined" ? localStorage.getItem("supplier_auth") : null;
        if (stored === "true") setAuthenticated(true);
      });
  }, []);

  useEffect(() => {
    if (!authenticated) { setLoading(false); return; }
    loadOrder();
  }, [token, authenticated]);

  function loadOrder() {
    setLoading(true);
    fetch(`/api/orders/token/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setOrder(data);
        setParticipants(data.participants || []);

        const flightMap = new Map();
        const roomMap = new Map();
        const ticketMap = new Map();
        for (const p of data.participants || []) {
          const fullName = `${p.first_name_en} ${p.last_name_en}`;
          if (p.flight_id && !flightMap.has(p.flight_id)) {
            flightMap.set(p.flight_id, {
              id: p.flight_id, type: "flight",
              name: p.flights ? `${p.flights.airline_name || ""} ${p.flights.flight_code || ""}`.trim() : "טיסה",
              details: p.flights ? `${p.flights.origin_iata || ""} → ${p.flights.dest_iata || ""} · ${p.flights.departure_time ? new Date(p.flights.departure_time).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : ""}` : "",
              participants: [fullName],
              confirmation_number: "", notes: "", has_issue: false, issue_description: "",
            });
          } else if (p.flight_id) {
            flightMap.get(p.flight_id).participants.push(fullName);
          }
          if (p.room_id && !roomMap.has(p.room_id)) {
            roomMap.set(p.room_id, {
              id: p.room_id, type: "room",
              name: p.rooms ? `${p.rooms.hotels?.name || "מלון"} · ${p.rooms.room_type || ""}` : "חדר",
              details: p.rooms ? `${p.rooms.check_in ? new Date(p.rooms.check_in).toLocaleDateString("he-IL") : ""} ← ${p.rooms.check_out ? new Date(p.rooms.check_out).toLocaleDateString("he-IL") : ""}` : "",
              participants: [fullName],
              confirmation_number: "", notes: "", has_issue: false, issue_description: "",
            });
          } else if (p.room_id) {
            roomMap.get(p.room_id).participants.push(fullName);
          }
          if (p.ticket_id && !ticketMap.has(p.ticket_id)) {
            ticketMap.set(p.ticket_id, {
              id: p.ticket_id, type: "ticket",
              name: p.tickets?.name || "כרטיס",
              details: "",
              participants: [fullName],
              confirmation_number: "", notes: "", has_issue: false, issue_description: "",
            });
          } else if (p.ticket_id) {
            ticketMap.get(p.ticket_id).participants.push(fullName);
          }
        }
        setItems([...Array.from(flightMap.values()), ...Array.from(roomMap.values()), ...Array.from(ticketMap.values())]);
      })
      .catch(() => setError("שגיאה בטעינת ההזמנה"))
      .finally(() => setLoading(false));
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/supplier/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (res.ok) {
        localStorage.setItem("supplier_auth", "true");
        setAuthenticated(true);
      } else {
        const d = await res.json();
        setLoginError(d.error || "פרטי התחברות שגויים");
      }
    } catch {
      setLoginError("שגיאה בהתחברות");
    }
  }

  function updateItem(idx: number, field: keyof Item, value: any) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }

  async function handleSubmit() {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/supplier/confirm-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_token: token,
          items: items.map((it) => ({
            item_type: it.type, item_id: it.id,
            confirmation_number: it.confirmation_number,
            notes: it.notes, has_issue: it.has_issue,
            issue_description: it.issue_description,
          })),
        }),
      });
      if (res.ok) setSuccess(true);
      else { const e = await res.json(); setError(e.error || "שגיאה"); }
    } catch { setError("שגיאה"); }
    finally { setSaving(false); }
  }

  // ========== LOGIN SCREEN ==========
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #FFF8ED 0%, #FFEFD4 100%)" }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-primary-900 mb-2">🔒 פורטל ספקים</h2>
          <p className="text-sm text-gray-600 mb-6">יש להזדהות כדי לצפות בפרטי ההזמנה</p>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{loginError}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מייל</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required dir="ltr"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סיסמה</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required dir="ltr"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-primary-500 outline-none" />
            </div>
            <button type="submit" className="w-full bg-primary-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800">
              כניסה
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-4 text-center">כניסה מוגבלת לספקים ואדמינים בלבד</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFF8ED" }}><div className="text-primary-700">טוען...</div></div>;
  if (error && !order) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#FFF8ED" }}><div className="text-red-500">{error}</div></div>;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #FFF8ED 0%, #FFEFD4 100%)" }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-primary-900 mb-2">תודה!</h2>
          <p className="text-gray-600">האישורים נשלחו למערכת בהצלחה.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FFF8ED 0%, #FFEFD4 100%)" }}>
      <header className="bg-gradient-to-l from-primary-800 to-primary-600 text-white py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ENG Tours - פורטל ספקים</h1>
            <p className="text-sm text-white/80 mt-1">אישור פרטי הזמנה</p>
          </div>
          <button onClick={loadOrder} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium">
            🔄 רענן
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">פרטי הזמנה</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-500 block text-xs">מספר הזמנה</span>
              <span className="font-mono font-medium">#{order?.id?.slice(0, 8)}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">אירוע</span>
              <span className="font-medium">{order?.events?.name || "—"}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">כמות נוסעים</span>
              <span className="font-medium">{participants.length}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs">סטטוס</span>
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                {order?.status || "—"}
              </span>
            </div>
          </div>

          {/* Passengers list */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">נוסעים:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {participants.map((p, i) => (
                <div key={p.id} className="text-sm bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="font-medium text-gray-800">{i + 1}. {p.first_name_en} {p.last_name_en}</span>
                  <div className="text-xs text-gray-500 mt-1">
                    דרכון: {p.passport_number} · לידה: {p.birth_date ? new Date(p.birth_date).toLocaleDateString("he-IL") : "—"}
                  </div>
                  <div className="text-xs text-gray-400" dir="ltr">{p.phone} · {p.email}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
              אין פריטים לאישור
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={`${item.type}-${item.id}`} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">
                      {item.type === "flight" ? "✈️" : item.type === "room" ? "🏨" : "🎫"}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-800">{item.name}</h3>
                      {item.details && <p className="text-xs text-gray-500 mt-0.5">{item.details}</p>}
                      <p className="text-xs text-primary-700 mt-1">עבור: {item.participants.join(", ")}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">מספר אישור</label>
                    <input type="text" value={item.confirmation_number} onChange={(e) => updateItem(idx, "confirmation_number", e.target.value)}
                      placeholder="הזן מספר אישור" dir="ltr"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">הערות</label>
                    <input type="text" value={item.notes} onChange={(e) => updateItem(idx, "notes", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={item.has_issue} onChange={(e) => updateItem(idx, "has_issue", e.target.checked)} className="w-4 h-4" />
                    <span className="text-red-600 font-medium">⚠️ יש בעיה בפריט זה</span>
                  </label>
                  {item.has_issue && (
                    <textarea value={item.issue_description} onChange={(e) => updateItem(idx, "issue_description", e.target.value)}
                      placeholder="תאר את הבעיה..." rows={2}
                      className="w-full mt-2 border border-red-200 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none resize-none" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => { localStorage.removeItem("supplier_auth"); setAuthenticated(false); }}
              className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm">
              יציאה
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="bg-primary-700 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50">
              {saving ? "שומר..." : "✓ שלח אישורים"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
