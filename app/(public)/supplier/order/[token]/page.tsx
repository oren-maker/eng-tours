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
  payment_amount: string;
  payment_currency: string;
  payment_method: string;
  payment_installments: string;
  payment_confirmation: string;
  payment_date: string;
  payment_due_date: string;
}

const EMPTY_PAYMENT = {
  payment_amount: "",
  payment_currency: "ILS",
  payment_method: "",
  payment_installments: "1",
  payment_confirmation: "",
  payment_date: "",
  payment_due_date: "",
};

export default function SupplierOrderPage() {
  const params = useParams();
  const token = params.token as string;

  const [authenticated, setAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [passportModal, setPassportModal] = useState<any>(null);

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [orderPayment, setOrderPayment] = useState({ ...EMPTY_PAYMENT });
  const [activeTab, setActiveTab] = useState<"order" | "payments">("order");
  const [newPayment, setNewPayment] = useState({ participant_id: "", amount: "", method: "credit", card_last4: "", confirmation: "", date: "" });
  const [savingPayment, setSavingPayment] = useState(false);
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
    fetch(`/api/orders/token/${token}?t=${Date.now()}`, { cache: "no-store" })
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
              unitPrice: Number(p.flights?.price_customer) || 0,
              itemCost: Number(p.flights?.price_customer) || 0,
              confirmation_number: "", notes: "", has_issue: false, issue_description: "", ...EMPTY_PAYMENT,
            });
          } else if (p.flight_id) {
            const it = flightMap.get(p.flight_id);
            it.participants.push(fullName);
            it.itemCost += it.unitPrice;
          }
          if (p.room_id && !roomMap.has(p.room_id)) {
            roomMap.set(p.room_id, {
              id: p.room_id, type: "room",
              name: p.rooms ? `${p.rooms.hotels?.name || "מלון"} · ${p.rooms.room_type || ""}` : "חדר",
              details: p.rooms ? `${p.rooms.check_in ? new Date(p.rooms.check_in).toLocaleDateString("he-IL") : ""} ← ${p.rooms.check_out ? new Date(p.rooms.check_out).toLocaleDateString("he-IL") : ""}` : "",
              participants: [fullName],
              unitPrice: Number(p.rooms?.price_customer) || 0,
              itemCost: Number(p.rooms?.price_customer) || 0,
              confirmation_number: "", notes: "", has_issue: false, issue_description: "", ...EMPTY_PAYMENT,
            });
          } else if (p.room_id) {
            const it = roomMap.get(p.room_id);
            it.participants.push(fullName);
            it.itemCost += it.unitPrice;
          }
          if (p.ticket_id && !ticketMap.has(p.ticket_id)) {
            ticketMap.set(p.ticket_id, {
              id: p.ticket_id, type: "ticket",
              name: p.tickets?.name || "כרטיס",
              details: "",
              participants: [fullName],
              unitPrice: Number(p.tickets?.price_customer) || 0,
              itemCost: Number(p.tickets?.price_customer) || 0,
              confirmation_number: "", notes: "", has_issue: false, issue_description: "", ...EMPTY_PAYMENT,
            });
          } else if (p.ticket_id) {
            const it = ticketMap.get(p.ticket_id);
            it.participants.push(fullName);
            it.itemCost += it.unitPrice;
          }
        }
        // Pre-fill existing supplier confirmations
        const existingConfirmations = data.supplier_confirmations || [];
        const allItems = [...Array.from(flightMap.values()), ...Array.from(roomMap.values()), ...Array.from(ticketMap.values())];
        for (const item of allItems) {
          // Find most recent confirmation for this item
          const existing = existingConfirmations.find((c: any) => c.item_type === item.type && c.item_id === item.id);
          if (existing) {
            item.confirmation_number = existing.confirmation_number || "";
            item.notes = existing.notes || "";
            item.has_issue = !!existing.has_issue;
            item.issue_description = existing.issue_description || "";
            item.payment_amount = existing.payment_amount != null ? String(existing.payment_amount) : "";
            item.payment_currency = existing.payment_currency || "ILS";
            item.payment_method = existing.payment_method || "";
            item.payment_installments = existing.payment_installments != null ? String(existing.payment_installments) : "1";
            item.payment_confirmation = existing.payment_confirmation || "";
            item.payment_date = existing.payment_date || "";
            item.payment_due_date = existing.payment_due_date || "";
            (item as any).existing = true;
          }
        }
        setItems(allItems);

        // Aggregate order-level payment from existing items
        const totalAmt = allItems.reduce((s, it) => s + (Number(it.payment_amount) || 0), 0);
        const first = allItems.find((it: any) => it.existing) as any;
        setOrderPayment({
          payment_amount: totalAmt > 0 ? String(totalAmt) : "",
          payment_currency: first?.payment_currency || "ILS",
          payment_method: first?.payment_method || "",
          payment_installments: first?.payment_installments || "1",
          payment_confirmation: first?.payment_confirmation || "",
          payment_date: first?.payment_date || "",
          payment_due_date: first?.payment_due_date || "",
        });
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

  async function handleAddPayment() {
    if (!newPayment.amount || Number(newPayment.amount) <= 0) {
      alert("יש להזין סכום");
      return;
    }
    setSavingPayment(true);
    try {
      const res = await fetch(`/api/supplier/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_token: token,
          participant_id: newPayment.participant_id,
          amount: Number(newPayment.amount),
          method: newPayment.method,
          card_last4: newPayment.card_last4 || null,
          confirmation: newPayment.confirmation || null,
          date: newPayment.date || null,
        }),
      });
      if (res.ok) {
        setNewPayment({ participant_id: "", amount: "", method: "credit", card_last4: "", confirmation: "", date: "" });
        loadOrder();
      } else {
        const d = await res.json();
        alert(d.error || "שגיאה בשמירה");
      }
    } catch {
      alert("שגיאה בשמירה");
    } finally {
      setSavingPayment(false);
    }
  }

  function applyPaymentToAll() {
    const count = items.length || 1;
    const totalAmt = Number(orderPayment.payment_amount) || 0;
    const perItem = totalAmt > 0 ? (totalAmt / count).toFixed(2) : "";
    setItems((prev) => prev.map((it) => ({
      ...it,
      payment_amount: perItem,
      payment_currency: orderPayment.payment_currency,
      payment_method: orderPayment.payment_method,
      payment_installments: orderPayment.payment_installments,
      payment_confirmation: orderPayment.payment_confirmation,
      payment_date: orderPayment.payment_date,
      payment_due_date: orderPayment.payment_due_date,
    })));
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
            payment_amount: it.payment_amount ? Number(it.payment_amount) : null,
            payment_currency: it.payment_currency || null,
            payment_method: it.payment_method || null,
            payment_installments: it.payment_installments ? Number(it.payment_installments) : null,
            payment_confirmation: it.payment_confirmation || null,
            payment_date: it.payment_date || null,
            payment_due_date: it.payment_due_date || null,
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
    const totalPrice = Number(order?.total_price || 0);
    const paid = Number(order?.amount_paid || 0);
    const remaining = Math.max(0, totalPrice - paid);
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #FFF8ED 0%, #FFEFD4 100%)" }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-primary-900 mb-2">תודה!</h2>
          <p className="text-gray-600 mb-6">האישורים נשלחו למערכת בהצלחה.</p>

          {remaining > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-sm">
              <span className="text-orange-800">נותר לתשלום: </span>
              <span className="font-bold text-orange-700">₪{remaining.toLocaleString("he-IL")}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {remaining > 0 && (
              <button
                onClick={() => { setSuccess(false); setActiveTab("payments"); }}
                className="bg-primary-700 hover:bg-primary-800 text-white px-5 py-3 rounded-lg text-sm font-medium"
              >
                💰 מעבר לתשלום
              </button>
            )}
            <button
              onClick={() => { setSuccess(false); setActiveTab("order"); }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 rounded-lg text-sm font-medium"
            >
              ← חזרה לפרטי הזמנה
            </button>
            <a
              href="/portal"
              className="text-xs text-gray-500 hover:text-primary-700 pt-2"
            >
              לעמוד הראשי של הספק
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FFF8ED 0%, #FFEFD4 100%)" }}>
      <header className="bg-gradient-to-l from-primary-800 to-primary-600 text-white py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ENG TOURS - פורטל ספקים</h1>
            <p className="text-sm text-white/80 mt-1">אישור פרטי הזמנה</p>
          </div>
          <button onClick={loadOrder} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium">
            🔄 רענן
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {(() => {
          const totalPrice = Number(order?.total_price || 0);
          const paid = Number(order?.amount_paid || 0);
          const remaining = totalPrice - paid;
          if (remaining <= 0 || !totalPrice) return null;
          return (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏰</span>
                <div>
                  <div className="text-sm font-semibold text-orange-900">נותר לתשלום</div>
                  <div className="text-xs text-orange-700">מתוך ₪{totalPrice.toLocaleString("he-IL")} · שולם ₪{paid.toLocaleString("he-IL")}</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-700">₪{remaining.toLocaleString("he-IL")}</div>
            </div>
          );
        })()}

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{i + 1}. {p.first_name_en} {p.last_name_en}</span>
                    {p.passport_number && (
                      <button onClick={() => setPassportModal(p as any)}
                        className="text-[10px] bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded hover:bg-primary-100">
                        🛂 הצג דרכון
                      </button>
                    )}
                  </div>
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

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("order")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "order" ? "border-b-2 border-primary-700 text-primary-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📋 פרטי הזמנה
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "payments" ? "border-b-2 border-primary-700 text-primary-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            💰 פרטי תשלום
          </button>
        </div>

        {activeTab === "payments" && (() => {
          const totalPrice = Number(order?.total_price || 0);
          const paid = Number(order?.amount_paid || 0);
          const remaining = Math.max(0, totalPrice - paid);
          const fullyPaid = remaining <= 0;
          return (
          <div className="space-y-4">
            {/* Summary */}
            <div className={`rounded-xl shadow-sm p-5 border-2 ${fullyPaid ? "bg-green-50 border-green-300" : "bg-orange-50 border-orange-300"}`}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-600">סכום כולל</div>
                  <div className="text-xl font-bold text-gray-800">₪{totalPrice.toLocaleString("he-IL")}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">שולם</div>
                  <div className="text-xl font-bold text-green-700">₪{paid.toLocaleString("he-IL")}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">{fullyPaid ? "✓ שולם במלואו" : "נותר לתשלום"}</div>
                  <div className={`text-xl font-bold ${fullyPaid ? "text-green-700" : "text-orange-700"}`}>
                    {fullyPaid ? "✓" : `₪${remaining.toLocaleString("he-IL")}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Existing payments */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">תשלומים שבוצעו</h3>
              {(() => {
                const pmts = (order?.payments || []) as any[];
                const rows = pmts.map((pm: any) => {
                  const payer = participants.find((pt: any) => pt.id === pm.participant_id) as any;
                  return {
                    key: "x-" + pm.id,
                    payer: payer ? `${payer.first_name_en} ${payer.last_name_en}` : "— כללי —",
                    amount: pm.amount,
                    method: pm.method,
                    card_last4: pm.card_last4,
                    confirmation: pm.confirmation,
                    date: pm.payment_date,
                  };
                });
                if (rows.length === 0) {
                  return <p className="text-sm text-gray-400 text-center py-4">לא נרשמו תשלומים עדיין</p>;
                }
                const methodLabels: Record<string, string> = { credit: "💳 כרטיס אשראי", transfer: "🏦 העברה בנקאית", cash: "💵 מזומן", check: "📝 צ'ק" };
                const totalSum = rows.reduce((s, r) => s + Number(r.amount), 0);
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-xs">
                          <th className="text-right px-3 py-2 font-medium">משלם</th>
                          <th className="text-right px-3 py-2 font-medium">סכום</th>
                          <th className="text-right px-3 py-2 font-medium">אמצעי</th>
                          <th className="text-right px-3 py-2 font-medium">4 ספרות</th>
                          <th className="text-right px-3 py-2 font-medium">אישור עסקה</th>
                          <th className="text-right px-3 py-2 font-medium">תאריך</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.map((r: any) => (
                          <tr key={r.key}>
                            <td className="px-3 py-2 font-medium">{r.payer}</td>
                            <td className="px-3 py-2 font-semibold">₪{Number(r.amount).toLocaleString("he-IL")}</td>
                            <td className="px-3 py-2">{methodLabels[r.method] || r.method || "-"}</td>
                            <td className="px-3 py-2 font-mono text-xs" dir="ltr">{r.card_last4 ? `**** ${r.card_last4}` : "-"}</td>
                            <td className="px-3 py-2 font-mono text-xs" dir="ltr">{r.confirmation || "-"}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">{r.date ? new Date(r.date).toLocaleDateString("he-IL") : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
                      <span className="text-gray-600">סה״כ שולם:</span>
                      <span className="font-bold text-green-700">₪{totalSum.toLocaleString("he-IL")}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Add payment form */}
            {fullyPaid ? (
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5 text-center">
                <div className="text-4xl mb-2">✓</div>
                <h3 className="text-lg font-semibold text-green-800">ההזמנה שולמה במלואה</h3>
                <p className="text-sm text-green-700 mt-1">לא ניתן להוסיף תשלומים נוספים</p>
              </div>
            ) : (
            <div className="bg-white rounded-xl shadow-sm p-5 border-2 border-primary-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">➕ הוסף תשלום</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">משלם (אופציונלי)</label>
                  <select value={newPayment.participant_id}
                    onChange={(e) => setNewPayment({ ...newPayment, participant_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none">
                    <option value="">— ללא שיוך / כללי —</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>{p.first_name_en} {p.last_name_en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    סכום <span className="text-gray-400">(מקסימום ₪{remaining.toLocaleString("he-IL")})</span>
                  </label>
                  <input type="number" step="0.01" max={remaining} value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    dir="ltr" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">אמצעי תשלום</label>
                  <select value={newPayment.method}
                    onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none">
                    <option value="credit">💳 כרטיס אשראי</option>
                    <option value="transfer">🏦 העברה בנקאית</option>
                    <option value="cash">💵 מזומן</option>
                    <option value="check">📝 צ&apos;ק</option>
                  </select>
                </div>
                {newPayment.method === "credit" && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">4 ספרות אחרונות</label>
                    <input type="text" maxLength={4} value={newPayment.card_last4}
                      onChange={(e) => setNewPayment({ ...newPayment, card_last4: e.target.value.replace(/\D/g, "") })}
                      dir="ltr" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">מספר אישור עסקה</label>
                  <input type="text" value={newPayment.confirmation}
                    onChange={(e) => setNewPayment({ ...newPayment, confirmation: e.target.value })}
                    dir="ltr" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">תאריך תשלום</label>
                  <input type="date" value={newPayment.date}
                    onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 outline-none" />
                </div>
              </div>
              <button onClick={handleAddPayment} disabled={savingPayment}
                className="mt-4 bg-primary-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50">
                {savingPayment ? "שומר..." : "💾 שמור תשלום"}
              </button>
            </div>
            )}
          </div>
          );
        })()}

        {activeTab === "order" && (<>
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
                  <div className="flex flex-col items-end gap-1">
                    {(item as any).existing && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                        ✓ כבר אושר
                      </span>
                    )}
                    {(item as any).itemCost > 0 && (
                      <span className="text-xs text-gray-600">
                        💰 עלות: ₪{Number((item as any).itemCost).toLocaleString("he-IL")}
                      </span>
                    )}
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
              {saving ? "שומר..." : items.some((i) => (i as any).existing) ? "💾 שמור שינויים" : "✓ שלח אישורים"}
            </button>
          </div>
        )}
        </>
        )}
      </main>

      {passportModal && <PassportModal passenger={passportModal} onClose={() => setPassportModal(null)} />}
    </div>
  );
}

function PassportModal({ passenger, onClose }: { passenger: any; onClose: () => void }) {
  const data = passenger.passport_data?.data || {};
  const fields: [string, any][] = [
    ["מספר דרכון", passenger.passport_number || data.passport_number],
    ["שם משפחה", data.surname || passenger.last_name_en],
    ["שמות פרטיים", data.given_names || passenger.first_name_en],
    ["תאריך לידה", passenger.birth_date || data.birth_date],
    ["תאריך הנפקה", data.issue_date],
    ["תאריך תפוגה", passenger.passport_expiry || data.expiry_date],
    ["מין", data.sex],
    ["לאום", data.nationality || passenger.passport_data?.issuing_country],
    ["מקום לידה", data.place_of_birth],
    ["MRZ שורה 1", data.mrz_line_1],
    ["MRZ שורה 2", data.mrz_line_2],
  ];
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">🛂 פרטי דרכון — {passenger.first_name_en} {passenger.last_name_en}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-2">×</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-y-auto">
          <div className="p-5 border-b lg:border-b-0 lg:border-l border-gray-200">
            <div className="text-xs font-semibold text-gray-500 mb-2">פירוט</div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {fields.map(([label, value]) => (
                  <tr key={label} className={value ? "" : "opacity-50"}>
                    <td className="py-2 bg-gray-50 font-medium text-gray-600 px-2 w-36">{label}</td>
                    <td className="py-2 px-2 font-mono text-xs" dir={typeof value === "string" && /[a-zA-Z0-9]/.test(value[0] || "") ? "ltr" : "auto"}>
                      {value || <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-5 bg-gray-50 flex items-center justify-center">
            {passenger.passport_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={passenger.passport_image_url} alt="passport" className="max-h-[70vh] object-contain rounded-lg shadow-lg" />
            ) : (
              <div className="text-gray-400 text-sm text-center py-12">
                <div className="text-4xl mb-2">📷</div>
                <div>אין צילום</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
