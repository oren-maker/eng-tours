import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// POST /api/coupons/validate - Validate coupon code (public)
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const { code, event_id } = body;

    if (!code) {
      return NextResponse.json(
        { error: "נדרש קוד קופון" },
        { status: 400 }
      );
    }

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!coupon) {
      return NextResponse.json(
        { valid: false, error: "קופון לא נמצא" },
        { status: 200 }
      );
    }

    // Check event match
    if (coupon.event_id && event_id && coupon.event_id !== event_id) {
      return NextResponse.json(
        { valid: false, error: "קופון לא תקף לאירוע זה" },
        { status: 200 }
      );
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: "הקופון פג תוקף" },
        { status: 200 }
      );
    }

    // Check max uses
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return NextResponse.json(
        { valid: false, error: "הקופון מוצה" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      applies_to: coupon.applies_to,
    });
  } catch (err) {
    console.error("Validate coupon error:", err);
    return NextResponse.json(
      { error: "שגיאה באימות קופון" },
      { status: 500 }
    );
  }
}
