export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

// Israeli ID number checksum (9 digits, Luhn-like, Ministry of Interior algorithm)
function validateIsraeliIdNumber(id: string): boolean {
  id = (id || "").replace(/\D/g, "").padStart(9, "0");
  if (id.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(id[i]) * ((i % 2) + 1);
    if (d > 9) d = Math.floor(d / 10) + (d % 10);
    sum += d;
  }
  return sum % 10 === 0;
}

const SYSTEM_PROMPT = `You are an OCR + document classifier specialized in Israeli government-issued ID cards ("תעודת זהות").
Respond ONLY with valid JSON — no prose, no markdown fences.

Required JSON schema:
{
  "is_israeli_id": boolean,
  "confidence": number,
  "document_type_guess": string,
  "reasons": string[],
  "data": {
    "id_number": string | null,
    "first_name_he": string | null,
    "last_name_he": string | null,
    "first_name_en": string | null,
    "last_name_en": string | null,
    "birth_date": string | null,
    "issue_date": string | null,
    "expiry_date": string | null,
    "sex": "M" | "F" | null,
    "nationality": string | null,
    "father_name": string | null,
    "mother_name": string | null
  },
  "notes": string
}

Rules:
- Israeli IDs contain: "מדינת ישראל", "תעודת זהות", Ministry of Interior logo, blue/teal color scheme, 9-digit ID number.
- If NOT an Israeli ID (passport, driver's license, random photo, unreadable), set is_israeli_id=false.
- Return null for fields you cannot read confidently. Do NOT guess.
- Dates: convert DD/MM/YYYY to YYYY-MM-DD. Partial → null.
- id_number: digits only, no spaces or dashes.`;

async function callGemini(base64: string, mimeType: string): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: "Classify this document and extract fields. Return ONLY JSON per the schema in the system instructions." },
      ],
    }],
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  };

  // Try models in order of preference (verified to work with vision on free tier)
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
        // If it's a quota issue, try next model; if it's auth/request issue, bail immediately
        if (res.status === 429 || /quota|rate.?limit/i.test(msg)) continue;
        throw lastError;
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) { lastError = new Error(`Gemini ${model}: empty response`); continue; }
      const parsed = JSON.parse(text);
      (parsed as any)._used_model = model;
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
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mimeType as any, data: base64 } },
        { type: "text", text: "Classify this document and extract fields. JSON only." },
      ],
    }],
  });
  const textBlock = response.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined;
  if (!textBlock) throw new Error("Anthropic returned empty response");
  let raw = textBlock.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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
      if (provider === "anthropic") {
        parsed = await callAnthropic(base64, file.type);
      } else {
        parsed = await callGemini(base64, file.type);
      }
    } catch (primaryErr: any) {
      // Fallback: if primary fails, try the other
      const fallback = provider === "anthropic" ? "gemini" : "anthropic";
      try {
        parsed = fallback === "gemini" ? await callGemini(base64, file.type) : await callAnthropic(base64, file.type);
        usedProvider = fallback + " (fallback)";
      } catch {
        throw primaryErr;
      }
    }

    const num = parsed?.data?.id_number;
    const checksumValid = num ? validateIsraeliIdNumber(num) : null;

    return NextResponse.json({
      ...parsed,
      checksum_valid: checksumValid,
      verified: !!(parsed.is_israeli_id && checksumValid),
      provider: usedProvider,
    });
  } catch (err: any) {
    console.error("israeli-id OCR error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
