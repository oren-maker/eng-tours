export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an OCR + document classifier specialized in PASSPORTS (any nationality).
Respond ONLY with valid JSON — no prose, no markdown fences.

Required JSON schema:
{
  "is_passport": boolean,
  "confidence": number,              // 0-1
  "document_type_guess": string,     // "passport", "id_card", "drivers_license", "other", "unreadable"
  "issuing_country": string | null,  // ISO 3166-1 alpha-3 or country name
  "reasons": string[],               // why you classified this way
  "data": {
    "passport_number": string | null,   // alphanumeric, strip spaces
    "surname": string | null,            // family name (often uppercase)
    "given_names": string | null,        // first + middle names
    "full_name_en": string | null,       // full English/Latin name
    "full_name_native": string | null,   // name in native script (Hebrew/Arabic/Cyrillic etc) if present
    "birth_date": string | null,         // YYYY-MM-DD
    "issue_date": string | null,         // YYYY-MM-DD
    "expiry_date": string | null,        // YYYY-MM-DD
    "sex": "M" | "F" | null,
    "nationality": string | null,        // ISO 3166-1 alpha-3 (e.g. ISR, USA, GBR) or country name
    "place_of_birth": string | null,
    "mrz_line_1": string | null,         // Machine-Readable Zone line 1 if visible
    "mrz_line_2": string | null          // MRZ line 2 if visible
  },
  "notes": string
}

Rules:
- Passports have: "PASSPORT" word, country name, photo, personal details, MRZ (2 lines at bottom).
- If document is NOT a passport (ID card, driver's license, random photo), set is_passport=false.
- Return null for fields you cannot read confidently. Do NOT guess.
- Dates: convert DD/MM/YYYY or DD MMM YYYY (15 JAN 1990) to YYYY-MM-DD. Partial → null.
- passport_number: alphanumeric only (letters + digits), strip spaces/dashes.
- MRZ lines: copy exactly as shown (uppercase, with < fillers). If not visible, null.`;

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
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  };

  const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];
  let lastError: Error | null = null;
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || `HTTP ${res.status}`;
        lastError = new Error(`Gemini ${model}: ${msg}`);
        if (res.status === 429 || /quota|rate.?limit/i.test(msg)) continue;
        throw lastError;
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) { lastError = new Error(`Gemini ${model}: empty response`); continue; }
      const parsed = JSON.parse(text);
      parsed._used_model = model;
      return parsed;
    } catch (e: any) {
      lastError = e;
      if (!/quota|rate.?limit|429/i.test(e.message || "")) throw e;
    }
  }
  throw lastError || new Error("All Gemini models exhausted");
}

async function callAnthropic(base64: string, mimeType: string): Promise<any> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: key });
  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mimeType as any, data: base64 } },
        { type: "text", text: "Classify this document and extract all fields. JSON only." },
      ],
    }],
  });
  const textBlock = response.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined;
  if (!textBlock) throw new Error("Anthropic returned empty response");
  const raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(raw);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const provider = (formData.get("provider") as string) || "gemini";
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

    let parsed: any;
    let usedProvider = provider;
    try {
      parsed = provider === "anthropic" ? await callAnthropic(base64, file.type) : await callGemini(base64, file.type);
    } catch (primaryErr: any) {
      const fallback = provider === "anthropic" ? "gemini" : "anthropic";
      try {
        parsed = fallback === "gemini" ? await callGemini(base64, file.type) : await callAnthropic(base64, file.type);
        usedProvider = fallback + " (fallback)";
      } catch {
        throw primaryErr;
      }
    }

    // Validations
    const today = new Date();
    const expiry = parsed?.data?.expiry_date ? new Date(parsed.data.expiry_date) : null;
    const issue = parsed?.data?.issue_date ? new Date(parsed.data.issue_date) : null;
    const expired = expiry ? expiry < today : null;
    const issueBeforeExpiry = issue && expiry ? issue < expiry : null;
    const sixMonthsFromNow = new Date(today.getTime() + 183 * 24 * 3600 * 1000);
    const expiresBefore6Months = expiry ? expiry < sixMonthsFromNow : null; // many countries require 6mo validity

    const verified = !!(
      parsed.is_passport &&
      parsed?.data?.passport_number &&
      parsed?.data?.expiry_date &&
      expired === false
    );

    return NextResponse.json({
      ...parsed,
      validations: {
        expired,
        issue_before_expiry: issueBeforeExpiry,
        expires_within_6_months: expiresBefore6Months,
      },
      verified,
      provider: usedProvider,
    });
  } catch (err: any) {
    console.error("passport OCR error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
