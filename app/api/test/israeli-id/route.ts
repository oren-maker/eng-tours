export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an OCR + document classifier specialized in PASSPORTS (any nationality).
Respond ONLY with valid JSON — no prose, no markdown fences.

Required JSON schema:
{
  "is_passport": boolean,
  "confidence": number,
  "document_type_guess": string,
  "issuing_country": string | null,
  "reasons": string[],
  "data": {
    "passport_number": string | null,
    "surname": string | null,
    "given_names": string | null,
    "full_name_en": string | null,
    "full_name_native": string | null,
    "birth_date": string | null,
    "issue_date": string | null,
    "expiry_date": string | null,
    "sex": "M" | "F" | null,
    "nationality": string | null,
    "place_of_birth": string | null,
    "mrz_line_1": string | null,
    "mrz_line_2": string | null
  },
  "notes": string
}

Rules:
- Passports have: "PASSPORT" word, country name, photo, personal details, MRZ (2 lines at bottom).
- If NOT a passport (ID card, driver's license, random photo), set is_passport=false.
- Return null for fields you cannot read confidently. Do NOT guess.
- Dates: convert DD/MM/YYYY or DD MMM YYYY (15 JAN 1990) to YYYY-MM-DD. Partial → null.
- passport_number: alphanumeric only, strip spaces/dashes.
- MRZ lines: copy exactly as shown. If not visible, null.`;

// === Groq (primary, free) ===
async function callGroq(base64: string, mimeType: string): Promise<any> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: [
          { type: "text", text: "Classify this document and extract all fields. JSON only." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        ]},
      ],
      response_format: { type: "json_object" },
      max_tokens: 2048,
      temperature: 0.1,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Groq: ${data?.error?.message || `HTTP ${res.status}`}`);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq: empty response");
  const parsed = JSON.parse(content);
  parsed._used_model = "groq/llama-4-scout";
  return parsed;
}

// === Gemini (fallback) ===
async function callGemini(base64: string, mimeType: string): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: "Classify this document and extract all fields. Return ONLY JSON per the schema." },
      ],
    }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 2048 },
  };
  const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];
  let lastError: Error | null = null;
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || `HTTP ${res.status}`;
        lastError = new Error(`Gemini ${model}: ${msg}`);
        if (res.status === 429 || /quota|rate.?limit/i.test(msg)) continue;
        throw lastError;
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) { lastError = new Error(`Gemini ${model}: empty`); continue; }
      const parsed = JSON.parse(text);
      parsed._used_model = `gemini/${model}`;
      return parsed;
    } catch (e: any) {
      lastError = e;
      if (!/quota|rate.?limit|429/i.test(e.message || "")) throw e;
    }
  }
  throw lastError || new Error("All Gemini models exhausted");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const provider = (formData.get("provider") as string) || "groq";
    if (!file) return NextResponse.json({ error: "נדרשת תמונה" }, { status: 400 });

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "פורמט לא נתמך (JPG/PNG/WEBP בלבד)" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "גודל הקובץ מעל 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Try chosen provider first, then fall back to the other
    const order = provider === "gemini" ? ["gemini", "groq"] : ["groq", "gemini"];
    let parsed: any = null;
    let usedProvider = "";
    let errors: string[] = [];
    for (let i = 0; i < order.length; i++) {
      const p = order[i];
      try {
        parsed = p === "groq" ? await callGroq(base64, file.type) : await callGemini(base64, file.type);
        usedProvider = i === 0 ? p : `${p} (fallback)`;
        break;
      } catch (e: any) {
        errors.push(`${p}: ${e.message || e}`);
      }
    }
    if (!parsed) {
      return NextResponse.json({ error: "כל המודלים נכשלו", details: errors }, { status: 502 });
    }

    // Validations
    const today = new Date();
    const expiry = parsed?.data?.expiry_date ? new Date(parsed.data.expiry_date) : null;
    const issue = parsed?.data?.issue_date ? new Date(parsed.data.issue_date) : null;
    const expired = expiry ? expiry < today : null;
    const issueBeforeExpiry = issue && expiry ? issue < expiry : null;
    const sixMonthsFromNow = new Date(today.getTime() + 183 * 24 * 3600 * 1000);
    const expiresBefore6Months = expiry ? expiry < sixMonthsFromNow : null;

    const verified = !!(
      parsed.is_passport &&
      parsed?.data?.passport_number &&
      parsed?.data?.expiry_date &&
      expired === false
    );

    return NextResponse.json({
      ...parsed,
      validations: { expired, issue_before_expiry: issueBeforeExpiry, expires_within_6_months: expiresBefore6Months },
      verified,
      provider: usedProvider,
    });
  } catch (err: any) {
    console.error("passport OCR error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
