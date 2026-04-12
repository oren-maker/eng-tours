import { NextRequest, NextResponse } from "next/server";

// POST /api/ocr/passport - Extract passport data from image
// NOTE: This is a placeholder implementation returning mock data.
// TODO: Integrate with Claude Vision API for real OCR.
// NOTE: Rate limit this endpoint in production (e.g., 5 req/min per IP)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "נדרשת תמונת דרכון" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "פורמט תמונה לא נתמך. יש להעלות JPG, PNG או WEBP" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "גודל הקובץ חורג מ-10MB" },
        { status: 400 }
      );
    }

    // =========================================
    // PLACEHOLDER: Return mock OCR data
    // In production, send image to Claude Vision API:
    //
    // const bytes = await file.arrayBuffer();
    // const base64 = Buffer.from(bytes).toString("base64");
    // const anthropic = new Anthropic();
    // const response = await anthropic.messages.create({
    //   model: "claude-sonnet-4-20250514",
    //   max_tokens: 1024,
    //   messages: [{
    //     role: "user",
    //     content: [
    //       { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
    //       { type: "text", text: "Extract passport MRZ data: first_name, last_name, passport_number, birth_date (YYYY-MM-DD), expiry_date (YYYY-MM-DD), nationality. Return JSON only." }
    //     ]
    //   }]
    // });
    // =========================================

    const mockData = {
      first_name: "ISRAEL",
      last_name: "ISRAELI",
      passport_number: "12345678",
      birth_date: "1990-01-15",
      expiry_date: "2028-06-20",
      nationality: "ISR",
      confidence: 0.85,
    };

    return NextResponse.json({
      success: true,
      data: mockData,
      is_mock: true,
    });
  } catch (err) {
    console.error("OCR error:", err);
    return NextResponse.json(
      { error: "שגיאה בזיהוי דרכון" },
      { status: 500 }
    );
  }
}
