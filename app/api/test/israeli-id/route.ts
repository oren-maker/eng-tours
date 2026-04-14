export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Israeli ID number checksum (9 digits, Luhn-like)
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "נדרשת תמונה" }, { status: 400 });

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "פורמט לא נתמך (JPG/PNG/WEBP בלבד)" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "גודל הקובץ מעל 10MB" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured on server" }, { status: 503 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `You are an OCR + document classifier specialized in Israeli government-issued ID cards ("תעודת זהות").
Respond ONLY with valid JSON — no prose, no markdown fences.

JSON schema:
{
  "is_israeli_id": boolean,
  "confidence": number,          // 0-1
  "document_type_guess": string, // e.g. "israeli_id_card", "passport", "drivers_license", "other", "unreadable"
  "reasons": string[],           // reasons for classification (e.g. "Hebrew ministry of interior stamp", "9-digit ID number visible")
  "data": {
    "id_number": string | null,  // 9 digits only (no dashes)
    "first_name_he": string | null,
    "last_name_he": string | null,
    "first_name_en": string | null,
    "last_name_en": string | null,
    "birth_date": string | null,        // YYYY-MM-DD
    "issue_date": string | null,        // YYYY-MM-DD
    "expiry_date": string | null,       // YYYY-MM-DD
    "sex": "M" | "F" | null,
    "nationality": string | null,
    "father_name": string | null,
    "mother_name": string | null
  },
  "notes": string
}

Rules:
- If image is NOT an Israeli ID card (passport, license, random photo, blurry), set is_israeli_id=false and fill document_type_guess.
- Israeli IDs contain: blue/teal gradient, "מדינת ישראל", "תעודת זהות", Ministry of Interior logo, 9-digit number.
- Return null for fields you cannot read with confidence; do NOT guess.
- Dates: try to parse DD/MM/YYYY into YYYY-MM-DD. If only partial, return null.`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: file.type as any, data: base64 } },
          { type: "text", text: "Classify this document and extract fields. JSON only." },
        ],
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined;
    if (!textBlock) return NextResponse.json({ error: "Vision API returned no text" }, { status: 500 });
    let raw = textBlock.text.trim();
    // Strip markdown code fences just in case
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "Could not parse Vision response", raw }, { status: 500 }); }

    // Local checksum verification
    let checksumValid: boolean | null = null;
    const num = parsed?.data?.id_number;
    if (num) checksumValid = validateIsraeliIdNumber(num);

    return NextResponse.json({
      ...parsed,
      checksum_valid: checksumValid,
      verified: !!(parsed.is_israeli_id && checksumValid),
    });
  } catch (err: any) {
    console.error("israeli-id OCR error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
