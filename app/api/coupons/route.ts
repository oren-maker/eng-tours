export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

// GET /api/coupons - List all coupons (admin)
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("coupons")
    .select("*, events(name)")
    .order("created_at" as never, { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const coupons = (data || []).map((c) => ({
    ...c,
    event_name: (c.events as { name: string } | null)?.name || null,
    events: undefined,
  }));

  return NextResponse.json({ coupons });
}

// POST /api/coupons - Create new coupon (admin)
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const {
      event_id,
      code,
      discount_type,
      discount_value,
      applies_to,
      max_uses,
      expires_at,
    } = body;

    if (!code || !discount_type || !discount_value) {
      return NextResponse.json(
        { error: "נדרש קוד, סוג הנחה וערך" },
        { status: 400 }
      );
    }

    // Check for duplicate code
    const { data: existing } = await supabase
      .from("coupons")
      .select("id")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "קוד קופון כבר קיים" },
        { status: 409 }
      );
    }

    const { data: coupon, error } = await supabase
      .from("coupons")
      .insert({
        event_id: event_id || null,
        code: code.toUpperCase(),
        discount_type,
        discount_value: Number(discount_value),
        applies_to: applies_to || "order",
        max_uses: max_uses ? Number(max_uses) : null,
        expires_at: expires_at || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    console.error("Create coupon error:", err);
    return NextResponse.json(
      { error: "שגיאה ביצירת קופון" },
      { status: 500 }
    );
  }
}
