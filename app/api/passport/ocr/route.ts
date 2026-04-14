export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

const PROMPTS: Record<string, string> = {
  passport: `You are an OCR + document classifier for PASSPORTS.
Respond ONLY with valid JSON.

Schema:
{
  "is_valid": boolean,
  "detected_type": "passport" | "id_card" | "drivers_license" | "other",
  "confidence": number,
  "issuing_country": string | null,
  "reasons": string[],
  "data": {
    "document_number": string | null,
    "surname": string | null,
    "given_names": string | null,
    "full_name_en": string | null,
    "birth_date": string | null,
    "issue_date": string | null,
    "expiry_date": string | null,
    "sex": "M" | "F" | null,
    "nationality": string | null,
    "place_of_birth": string | null,
    "mrz_line_1": string | null,
    "mrz_line_2": string | null
  }
}

Rules:
- If NOT a passport, set is_valid=false and set detected_type accordingly.
- document_number: alphanumeric, no spaces/dashes (passport number).
- Dates: YYYY-MM-DD. Partial → null.
- Do NOT guess.`,

  id_card: `You are an OCR + document classifier for Israeli ID CARDS (תעודת זהות).
Respond ONLY with valid JSON.

Schema:
{
  "is_valid": boolean,
  "detected_type": "id_card" | "passport" | "drivers_license" | "other",
  "confidence": number,
  "issuing_country": string | null,
  "reasons": string[],
  "data": {
    "document_number": string | null,
    "surname": string | null,
    "given_names": string | null,
    "full_name_he": string | null,
    "full_name_en": string | null,
    "birth_date": string | null,
    "issue_date": string | null,
    "expiry_date": string | null,
    "sex": "M" | "F" | null,
    "nationality": string | null,
    "father_name": string | null
  }
}

Rules:
- Israeli IDs have: "מדינת ישראל", "תעודת זהות", Ministry of Interior logo, blue/teal color, 9-digit ID number.
- If NOT an Israeli ID, set is_valid=false.
- document_number: 9 digits only (no dashes).
- Dates: DD/MM/YYYY → YYYY-MM-DD.
- Do NOT guess.`,

  drivers_license: `You are an OCR + document classifier for Israeli DRIVER'S LICENSES (רישיון נהיגה).
Respond ONLY with valid JSON.

Schema:
{
  "is_valid": boolean,
  "detected_type": "drivers_license" | "passport" | "id_card" | "other",
  "confidence": number,
  "issuing_country": string | null,
  "reasons": string[],
  "data": {
    "document_number": string | null,
    "surname": string | null,
    "given_names": string | null,
    "full_name_he": string | null,
    "full_name_en": string | null,
    "birth_date": string | null,
    "issue_date": string | null,
    "expiry_date": string | null,
    "sex": "M" | "F" | null,
    "nationality": string | null,
    "license_categories": string | null
  }
}

Rules:
- Israeli driver's licenses have: "רישיון נהיגה", "מדינת ישראל" / "State of Israel", categories (B, A, etc.), photo.
- If NOT a driver's license, set is_valid=false.
- document_number: license number (digits only).
- Dates: YYYY-MM-DD.
- Do NOT guess.`,
};

function idNumberChecksum(id: string): boolean {
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

async function callGroq(base64: string, mimeType: string, prompt: string): Promise<any> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: [
          { type: "text", text: "Classify and extract. JSON only." },
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
  const parsed = JSON.parse(data?.choices?.[0]?.message?.content);
  parsed._used_model = "groq/llama-4-scout";
  return parsed;
}

async function callGemini(base64: string, mimeType: string, prompt: string): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing");
  const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: "Classify and extract. JSON only." },
          ]}],
          systemInstruction: { parts: [{ text: prompt }] },
          generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 2048 },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 || /quota|rate.?limit/i.test(data?.error?.message || "")) continue;
        throw new Error(`Gemini ${model}: ${data?.error?.message || res.status}`);
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      const parsed = JSON.parse(text);
      parsed._used_model = `gemini/${model}`;
      return parsed;
    } catch {}
  }
  throw new Error("All Gemini models exhausted");
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = rateLimit(`passport-ocr:${ip}`, 30, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "יותר מדי ניסיונות" }, { status: 429 });

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const docType = (formData.get("document_type") as string) || "passport";
    if (!file) return NextResponse.json({ error: "נדרשת תמונה" }, { status: 400 });
    if (!["passport", "id_card", "drivers_license"].includes(docType)) {
      return NextResponse.json({ error: "סוג מסמך לא תקין" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) return NextResponse.json({ error: "פורמט לא נתמך" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "גודל מעל 10MB" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const prompt = PROMPTS[docType];
    let parsed: any = null;
    let usedProvider = "";
    try {
      parsed = await callGroq(base64, file.type, prompt);
      usedProvider = "groq";
    } catch {
      try {
        parsed = await callGemini(base64, file.type, prompt);
        usedProvider = "gemini (fallback)";
      } catch (e: any) {
        return NextResponse.json({ error: "שגיאה בזיהוי: " + e.message }, { status: 502 });
      }
    }

    // Checksum for Israeli ID
    if (docType === "id_card" && parsed?.data?.document_number) {
      parsed.checksum_valid = idNumberChecksum(parsed.data.document_number);
      if (parsed.is_valid && !parsed.checksum_valid) {
        parsed.is_valid = false;
        parsed.reasons = [...(parsed.reasons || []), "ספרת ביקורת של תעודת הזהות לא תקינה"];
      }
    }

    parsed.document_type = docType;

    // Upload image
    let imageUrl: string | null = null;
    try {
      const supabase = createServiceClient();
      const ext = file.type.split("/")[1] || "jpg";
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
      const { data: uploadData } = await supabase.storage
        .from("passports")
        .upload(filename, bytes, { contentType: file.type, upsert: false });
      if (uploadData) {
        const { data: signed } = await supabase.storage.from("passports").createSignedUrl(filename, 60 * 60 * 24 * 30);
        imageUrl = signed?.signedUrl || null;
      }
    } catch {}

    return NextResponse.json({ ...parsed, image_url: imageUrl, provider: usedProvider });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
