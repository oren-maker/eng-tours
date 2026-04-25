"use client";

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; interest: "package_inquiry" | "ticket_purchase"; firstName: string }
  | { kind: "error"; message: string };

export default function LeadForm({ slug }: { slug: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<"" | "package_inquiry" | "ticket_purchase">("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function validate(): string | null {
    if (firstName.trim().length < 2) return "שם פרטי חייב לפחות 2 תווים";
    if (lastName.trim().length < 2) return "שם משפחה חייב לפחות 2 תווים";
    if (/\d/.test(firstName) || /\d/.test(lastName)) return "שם לא יכול להכיל מספרים";
    if (!/^[\d+\-\s()]{7,}$/.test(phone)) return "טלפון לא תקין";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "מייל לא תקין";
    if (!interest) return "בחר במה אתה מעוניין";
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
          slug,
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
          interest_type: interest,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: d.error || "שגיאה בשליחה" });
        return;
      }
      setStatus({
        kind: "success",
        interest: interest as "package_inquiry" | "ticket_purchase",
        firstName: firstName.trim(),
      });
    } catch {
      setStatus({ kind: "error", message: "שגיאת רשת — נסה שוב" });
    }
  }

  if (status.kind === "success") {
    const isTicket = status.interest === "ticket_purchase";
    return (
      <div className="rounded-2xl bg-green-500/10 border border-green-500/30 p-8 text-center">
        <div className="text-5xl mb-3">{isTicket ? "🎫" : "📦"}</div>
        <h2 className="text-2xl font-bold mb-2">תודה {status.firstName}!</h2>
        <p className="text-white/80 leading-relaxed">
          {isTicket
            ? "שלחנו לך הודעת WhatsApp עם קישור הרכישה."
            : "ניצור איתך קשר בקרוב עם פרטי החבילה."}
        </p>
      </div>
    );
  }

  const inputClass = "w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-red-500 focus:bg-white/10 transition-colors";
  const labelClass = "block text-sm font-medium text-white/80 mb-1.5";

  return (
    <form onSubmit={submit} className="space-y-3 bg-white/[0.03] border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-sm">
      <h2 className="text-xl md:text-2xl font-bold text-center mb-3">השאר פרטים</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>שם פרטי</label>
          <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} placeholder="ישראל" autoComplete="given-name" />
        </div>
        <div>
          <label className={labelClass}>שם משפחה</label>
          <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder="ישראלי" autoComplete="family-name" />
        </div>
      </div>

      <div>
        <label className={labelClass}>טלפון</label>
        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="050-1234567" dir="ltr" autoComplete="tel" />
      </div>

      <div>
        <label className={labelClass}>מייל</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="name@example.com" dir="ltr" autoComplete="email" />
      </div>

      <div>
        <label className={labelClass}>אני מעוניין ב…</label>
        <select required value={interest} onChange={(e) => setInterest(e.target.value as "package_inquiry" | "ticket_purchase")}
          className={inputClass}>
          <option value="" className="bg-black">— בחר —</option>
          <option value="package_inquiry" className="bg-black">חבילת סוף שבוע (טיסה + מלון)</option>
          <option value="ticket_purchase" className="bg-black">רכישת כרטיס בלבד</option>
        </select>
      </div>

      <label className="flex items-start gap-2 text-xs text-white/70 cursor-pointer pt-2">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-red-600" />
        <span>אני מאשר/ת קבלת עדכונים בWhatsApp / מייל לגבי האירוע הזה</span>
      </label>

      {status.kind === "error" && (
        <div className="rounded-lg bg-red-500/15 border border-red-500/40 px-4 py-2.5 text-sm text-red-100">
          ⚠ {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={status.kind === "submitting"}
        className="w-full bg-red-600 hover:bg-red-500 text-white text-base md:text-lg font-bold uppercase tracking-wide py-4 rounded-xl shadow-lg shadow-red-900/40 disabled:opacity-50 transition-all hover:scale-[1.01]"
      >
        {status.kind === "submitting" ? "שולח..." : "שלח פרטים"}
      </button>
    </form>
  );
}
