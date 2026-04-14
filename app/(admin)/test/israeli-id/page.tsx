"use client";

import { useState, useRef } from "react";

export default function PassportTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState<"gemini" | "anthropic">("gemini");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    setFile(f); setResult(null); setError("");
    if (f) { setPreview(URL.createObjectURL(f)); } else setPreview(null);
  }

  async function analyze() {
    if (!file) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("provider", provider);
      const res = await fetch("/api/test/israeli-id", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) setError(data.error || "שגיאה"); else setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  function reset() {
    setFile(null); setPreview(null); setResult(null); setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const fieldLabels: Record<string, string> = {
    passport_number: "מספר דרכון",
    surname: "שם משפחה",
    given_names: "שמות פרטיים",
    full_name_en: "שם מלא (אנגלית)",
    full_name_native: "שם מלא (מקומי)",
    birth_date: "תאריך לידה",
    issue_date: "תאריך הנפקה",
    expiry_date: "תאריך תפוגה",
    sex: "מין",
    nationality: "לאום",
    place_of_birth: "מקום לידה",
    mrz_line_1: "MRZ שורה 1",
    mrz_line_2: "MRZ שורה 2",
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">🧪 עמוד בדיקה זמני</span>
        </div>
        <h2 className="text-2xl font-bold text-primary-900">🛂 זיהוי דרכון</h2>
        <p className="text-sm text-gray-500 mt-1">
          העלה תמונת דרכון. המערכת תזהה אם זה באמת דרכון, תחלץ מספר דרכון + תאריכי הנפקה ותפוגה, ותאמת תוקף.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">📤 העלאת תמונה</h3>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-2 font-medium">מודל:</div>
            <div className="flex gap-2">
              <button onClick={() => setProvider("gemini")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition ${provider === "gemini" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
                🆓 Gemini (חינם)
              </button>
              <button onClick={() => setProvider("anthropic")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition ${provider === "anthropic" ? "bg-orange-600 text-white border-orange-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
                💰 Claude (דורש קרדיט)
              </button>
            </div>
          </div>

          <label htmlFor="idfile" className="flex flex-col items-center justify-center border-2 border-dashed border-primary-300 rounded-xl p-8 cursor-pointer hover:bg-primary-50 transition-colors">
            <span className="text-4xl mb-2">🛂</span>
            <span className="text-sm text-gray-600 mb-1">לחץ או גרור תמונת דרכון לכאן</span>
            <span className="text-xs text-gray-400">JPG / PNG / WEBP · עד 10MB</span>
          </label>
          <input ref={fileRef} id="idfile" type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)} />

          {preview && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">תצוגה מקדימה:</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="preview" className="max-h-80 rounded-lg border border-gray-200 object-contain bg-gray-50" />
              <div className="flex gap-2 mt-3">
                <button onClick={analyze} disabled={loading} className="bg-primary-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-50">
                  {loading ? "מנתח..." : "🔍 נתח דרכון"}
                </button>
                <button onClick={reset} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                  נקה
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Result */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">📊 תוצאות</h3>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">❌ {error}</div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 mx-auto border-b-2 border-primary-700 rounded-full" />
              <div className="text-sm text-gray-500 mt-3">שולח ל-Vision API...</div>
            </div>
          )}

          {result && (
            <div className="space-y-3 text-sm">
              {/* Verification banner */}
              <div className={`rounded-lg p-3 border-2 ${result.verified ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className={`font-bold text-base ${result.verified ? "text-green-800" : "text-red-800"}`}>
                    {result.verified ? "✅ דרכון תקין זוהה" : "❌ לא אומת כדרכון תקין"}
                  </div>
                  {result.provider && <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border" dir="ltr">via {result.provider}</span>}
                </div>
                <div className="text-xs mt-1 text-gray-700">
                  זיהוי כדרכון: <b>{result.is_passport ? "כן" : "לא"}</b> · ביטחון: <b>{Math.round((result.confidence || 0) * 100)}%</b>
                  {result.issuing_country && <> · מדינה מנפיקה: <b>{result.issuing_country}</b></>}
                </div>
                {result.validations && (
                  <div className="text-xs mt-2 space-y-0.5">
                    {result.validations.expired === true && <div className="text-red-700 font-semibold">⚠️ הדרכון פג תוקף</div>}
                    {result.validations.expired === false && <div className="text-green-700">✓ הדרכון בתוקף</div>}
                    {result.validations.expires_within_6_months === true && <div className="text-orange-700">⚠️ תוקף מסתיים תוך פחות מ-6 חודשים (חלק מהמדינות דורשות 6 חודשים לפחות)</div>}
                    {result.validations.issue_before_expiry === false && <div className="text-red-700">⚠️ תאריך הנפקה מאוחר מתאריך תפוגה — חריג</div>}
                  </div>
                )}
                {result.reasons && result.reasons.length > 0 && (
                  <ul className="text-xs mt-2 list-disc list-inside text-gray-600">
                    {result.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>

              {/* Highlighted key fields */}
              {result.data && result.is_passport && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                    <div className="text-[10px] text-primary-600 font-medium">מספר דרכון</div>
                    <div className="text-lg font-bold font-mono text-primary-900" dir="ltr">{result.data.passport_number || "—"}</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-[10px] text-green-700 font-medium">הונפק</div>
                    <div className="text-lg font-bold text-green-900" dir="ltr">{result.data.issue_date || "—"}</div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="text-[10px] text-orange-700 font-medium">תפוגה</div>
                    <div className="text-lg font-bold text-orange-900" dir="ltr">{result.data.expiry_date || "—"}</div>
                  </div>
                </div>
              )}

              {/* All extracted fields */}
              {result.data && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">כל השדות שחולצו</div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(result.data).map(([k, v]) => (
                        <tr key={k} className={v ? "" : "opacity-50"}>
                          <td className="px-3 py-1.5 bg-gray-50 font-medium text-gray-600 w-36">{fieldLabels[k] || k}</td>
                          <td className="px-3 py-1.5 font-mono" dir={typeof v === "string" && /[a-zA-Z0-9]/.test(v[0] || "") ? "ltr" : "auto"}>
                            {v == null ? <span className="text-gray-400">null</span> : String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {result.notes && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-xs">
                  📝 <b>Notes:</b> {result.notes}
                </div>
              )}

              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">▶ הצג JSON גולמי</summary>
                <pre className="bg-gray-50 p-3 rounded mt-2 overflow-x-auto text-[10px]" dir="ltr">{JSON.stringify(result, null, 2)}</pre>
              </details>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="text-center py-12 text-gray-400 text-sm">
              העלה תמונה ולחץ &quot;נתח&quot; כדי להתחיל
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <div className="font-semibold mb-1">ℹ️ הערות:</div>
        <ul className="list-disc list-inside text-xs space-y-0.5">
          <li>המערכת משתמשת ב-Gemini Vision / Claude Vision לזיהוי דרכונים מכל מדינה.</li>
          <li>תאריכי הנפקה ותפוגה נמשכים אוטומטית והתוקף נבדק מול התאריך של היום.</li>
          <li>אזהרת 6 חודשים — חלק מהמדינות דורשות שהדרכון יהיה בתוקף ל-6 חודשים לפחות מעבר למועד הנסיעה.</li>
          <li>עמוד זה זמני — לבדיקה בלבד. ההחלטה על שילוב במערכת הראשית תתבצע בהמשך.</li>
        </ul>
      </div>
    </div>
  );
}
