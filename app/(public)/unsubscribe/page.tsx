"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-primary-700">טוען...</div></div>}>
      <Unsub />
    </Suspense>
  );
}

function Unsub() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const token = params.get("token") || "";

  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, reason }),
      });
      if (res.ok) setDone(true);
      else { const d = await res.json(); setError(d.error || "שגיאה"); }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #FFF8ED 0%, #FFEFD4 100%)" }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ENG TOURS" className="h-12 w-auto mx-auto object-contain" />
          <h1 className="text-2xl font-bold text-primary-900 mt-3">הסרה מרשימת תפוצה</h1>
        </div>

        {done ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-5xl mb-3">✓</div>
            <h2 className="text-lg font-semibold text-green-800 mb-2">הוסרת בהצלחה</h2>
            <p className="text-sm text-green-700">המייל <b dir="ltr">{email}</b> הוסר מרשימת התפוצה שלנו.</p>
            <p className="text-xs text-gray-500 mt-4">לא תקבל/י עוד הודעות שיווק מ-ENG TOURS. הודעות מערכת הקשורות להזמנות פעילות עדיין יישלחו.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              האם ברצונך להסיר את המייל <b dir="ltr">{email || "—"}</b> מרשימת התפוצה של ENG TOURS?
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">סיבה (אופציונלי):</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— ללא סיבה —</option>
                <option value="too_many_emails">יותר מדי מיילים</option>
                <option value="not_relevant">התוכן לא רלוונטי עבורי</option>
                <option value="never_signed_up">לא נרשמתי לקבל מיילים</option>
                <option value="other">אחר</option>
              </select>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2 text-xs rounded mb-3">❌ {error}</div>}

            <button onClick={confirm} disabled={loading || !email}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
              {loading ? "מעבד..." : "✗ הסר אותי מרשימת התפוצה"}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              לא תקבל עוד הודעות שיווק, אך הודעות חשובות על הזמנות פעילות יישלחו כרגיל.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
