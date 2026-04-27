"use client";

import { useEffect, useState } from "react";

export interface InterestOption { value: string; label: string; }

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; interest: string; firstName: string }
  | { kind: "error"; message: string };

export default function LeadForm({
  slug,
  affiliateCode,
  theme = "default",
  interestOptions,
  onSuccess,
}: {
  slug: string;
  affiliateCode: string;
  theme?: string;
  interestOptions: InterestOption[];
  onSuccess?: () => void;
}) {
  useEffect(() => {
    if (!affiliateCode) return;
    fetch("/api/marketing/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: affiliateCode }),
    }).catch(() => {});
  }, [affiliateCode]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<string>("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const allowedValues = interestOptions.map((o) => o.value);

  function validate(): string | null {
    if (firstName.trim().length < 2) return "שם פרטי חייב לפחות 2 תווים";
    if (lastName.trim().length < 2) return "שם משפחה חייב לפחות 2 תווים";
    if (/\d/.test(firstName) || /\d/.test(lastName)) return "שם לא יכול להכיל מספרים";
    if (!/^[\d+\-\s()]{7,}$/.test(phone)) return "טלפון לא תקין";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "מייל לא תקין";
    if (!interest || !allowedValues.includes(interest)) return "בחר במה אתה מעוניין";
    if (!consent) return "צריך לאשר את הסכמת השליחה";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setStatus({ kind: "error", message: err }); return; }
    setStatus({ kind: "submitting" });

    try {
      const res = await fetch("/api/marketing/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, first_name: firstName, last_name: lastName, phone, email,
          interest_type: interest,
          affiliate_code: affiliateCode || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: d.error || "שגיאה בשליחה" });
        return;
      }
      setStatus({ kind: "success", interest, firstName: firstName.trim() });
      onSuccess?.();
    } catch {
      setStatus({ kind: "error", message: "שגיאת רשת — נסה שוב" });
    }
  }

  // Theme-specific styling
  const isSunset = theme === "sunset";
  const isAura = theme === "aura";
  const formCls = isAura
    ? "space-y-3 rounded-2xl p-5 md:p-7 backdrop-blur-md border"
    : isSunset
    ? "space-y-3 rounded-2xl p-5 md:p-7 backdrop-blur-md border"
    : "space-y-3 bg-white/[0.03] border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-sm";
  const formStyle = isAura
    ? { background: "rgba(15,40,90,0.55)", borderColor: "rgba(79,195,247,0.35)", boxShadow: "0 0 80px rgba(79,195,247,0.25), inset 0 0 40px rgba(79,195,247,0.05)" }
    : isSunset
    ? { background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.25)" }
    : undefined;
  const inputCls = isAura
    ? "w-full bg-[#0B1E3C]/60 border border-[#4FC3F7]/30 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-[#4FC3F7] focus:bg-[#0B1E3C]/80 transition-colors"
    : isSunset
    ? "w-full bg-white/15 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/55 outline-none focus:border-white/70 focus:bg-white/20 transition-colors"
    : "w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-red-500 focus:bg-white/10 transition-colors";
  const labelCls = "block text-sm font-medium text-white/90 mb-1.5";
  const buttonCls = isAura || isSunset
    ? "w-full text-white text-base md:text-lg font-bold uppercase tracking-wide py-4 rounded-xl shadow-lg disabled:opacity-50 transition-all hover:scale-[1.01]"
    : "w-full bg-red-600 hover:bg-red-500 text-white text-base md:text-lg font-bold uppercase tracking-wide py-4 rounded-xl shadow-lg shadow-red-900/40 disabled:opacity-50 transition-all hover:scale-[1.01]";
  const buttonStyle = isAura
    ? { background: "linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%)", boxShadow: "0 10px 30px rgba(79,195,247,0.55)" }
    : isSunset
    ? { background: "linear-gradient(135deg, #8E44AD 0%, #FF8C42 100%)", boxShadow: "0 10px 30px rgba(255,140,66,0.5)" }
    : undefined;
  const accentColor = isAura ? "accent-blue-500" : isSunset ? "accent-orange-500" : "accent-red-600";
  const errCls = isAura
    ? "rounded-lg bg-blue-500/15 border border-blue-400/40 px-4 py-2.5 text-sm text-white"
    : isSunset
    ? "rounded-lg bg-white/20 border border-white/40 px-4 py-2.5 text-sm text-white"
    : "rounded-lg bg-red-500/15 border border-red-500/40 px-4 py-2.5 text-sm text-red-100";

  if (status.kind === "success") {
    const isTicket = status.interest === "ticket_purchase";
    return (
      <div className={isAura
        ? "rounded-2xl border p-8 text-center backdrop-blur-md"
        : isSunset
        ? "rounded-2xl border p-8 text-center backdrop-blur-md"
        : "rounded-2xl bg-green-500/10 border border-green-500/30 p-8 text-center"}
        style={isAura
          ? { background: "rgba(15,40,90,0.55)", borderColor: "rgba(79,195,247,0.45)", boxShadow: "0 0 80px rgba(79,195,247,0.3)" }
          : isSunset
          ? { background: "rgba(255,255,255,0.18)", borderColor: "rgba(255,255,255,0.35)" }
          : undefined}>
        <div className="text-5xl mb-3">{isTicket ? "🎫" : status.interest === "vip" ? "✨" : status.interest === "info_only" ? "ℹ️" : "📦"}</div>
        <h2 className="text-2xl font-bold mb-2">תודה {status.firstName}!</h2>
        <p className="text-white/90 leading-relaxed">
          {isTicket
            ? "שלחנו לך הודעת WhatsApp ומייל עם קישור הרכישה."
            : "ניצור איתך קשר בקרוב."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={formCls} style={formStyle}>
      <h2 className="text-xl md:text-2xl font-bold text-center mb-3">השאר פרטים</h2>
      <p className="text-center text-xs text-white/80 mb-2">השאירו את הפרטים וקבלו עדכונים על הרשמה, מבצעים והכרטיסים לאירוע</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>שם פרטי <span className="text-white">*</span></label>
          <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} placeholder="ישראל" autoComplete="off" />
        </div>
        <div>
          <label className={labelCls}>שם משפחה <span className="text-white">*</span></label>
          <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} placeholder="ישראלי" autoComplete="off" />
        </div>
      </div>

      <div>
        <label className={labelCls}>טלפון <span className="text-white">*</span></label>
        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="050-1234567" dir="ltr" autoComplete="off" />
      </div>

      <div>
        <label className={labelCls}>מייל <span className="text-white">*</span></label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="name@example.com" dir="ltr" autoComplete="off" />
      </div>

      <div>
        <label className={labelCls}>אני מעוניין ב… <span className="text-white">*</span></label>
        <select required value={interest} onChange={(e) => setInterest(e.target.value)} className={inputCls}>
          <option value="" className="bg-black">— בחר —</option>
          {interestOptions.map((o) => (
            <option key={o.value} value={o.value} className="bg-black">{o.label}</option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-2 text-xs text-white/85 cursor-pointer pt-2">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className={`mt-0.5 w-4 h-4 ${accentColor}`} />
        <span>אני מאשר/ת קבלת עדכונים בWhatsApp / מייל לגבי האירוע הזה</span>
      </label>

      {status.kind === "error" && (
        <div className={errCls}>⚠ {status.message}</div>
      )}

      <button
        type="submit"
        disabled={status.kind === "submitting"}
        className={buttonCls}
        style={buttonStyle}
      >
        {status.kind === "submitting" ? "שולח..." : "שלח פרטים"}
      </button>
    </form>
  );
}
