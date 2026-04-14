export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

const SYSTEM_PROMPT = `You are an OCR + document classifier for PASSPORTS.
Respond ONLY with valid JSON.

Schema:
{
  "is_passport": boolean,
  "confidence": number,
  "issuing_country": string | null,
  "reasons": string[],
  "data": {
    "passport_number": string | null,
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
- If NOT a passport, set is_passport=false.
- passport_number: alphanumeric, no spaces/dashes.
- Dates: YYYY-MM-DD. Partial → null.
- Do NOT guess; use null if unsure.`;

async function callGroq(base64: string, mimeType: string): Promise<any> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
  const content = data?.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  parsed._used_model = "groq/llama-4-scout";
  return parsed;
}

async function callGemini(base64: string, mimeType: string): Promise<any> {
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
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
    // Rate limit — 30 attempts/min/IP (covers ~10 passport uploads)
    const ip = getClientIp(request);
    const rl = rateLimit(`passport-ocr:${ip}`, 30, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: "יותר מדי ניסיונות. נסה שוב עוד דקה." }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "נדרשת תמונה" }, { status: 400 });

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "פורמט לא נתמך" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "גודל מעל 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Try Groq → Gemini
    let parsed: any = null;
    let usedProvider = "";
    try {
      parsed = await callGroq(base64, file.type);
      usedProvider = "groq";
    } catch {
      try {
        parsed = await callGemini(base64, file.type);
        usedProvider = "gemini (fallback)";
      } catch (e: any) {
        return NextResponse.json({ error: "שגיאה בזיהוי הדרכון: " + e.message }, { status: 502 });
      }
    }

    // Upload image to Supabase Storage (private bucket)
    let imageUrl: string | null = null;
    try {
      const supabase = createServiceClient();
      const ext = file.type.split("/")[1] || "jpg";
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("passports")
        .upload(filename, bytes, { contentType: file.type, upsert: false });
      if (!uploadErr && uploadData) {
        // Signed URL valid for 30 days (re-signed when accessed)
        const { data: signed } = await supabase.storage.from("passports").createSignedUrl(filename, 60 * 60 * 24 * 30);
        imageUrl = signed?.signedUrl || null;
        // Keep the path too for re-signing
        parsed._storage_path = uploadData.path;
      }
    } catch (e: any) {
      console.error("Storage upload failed:", e.message);
      // Non-fatal — we can still return OCR result without image
    }

    return NextResponse.json({
      ...parsed,
      image_url: imageUrl,
      provider: usedProvider,
    });
  } catch (err: any) {
    console.error("passport OCR error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
