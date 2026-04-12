import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// PATCH /api/coupons/[id] - Update coupon (toggle active, edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.code !== undefined) updateData.code = body.code;
    if (body.discount_type !== undefined) updateData.discount_type = body.discount_type;
    if (body.discount_value !== undefined) updateData.discount_value = body.discount_value;
    if (body.applies_to !== undefined) updateData.applies_to = body.applies_to;
    if (body.max_uses !== undefined) updateData.max_uses = body.max_uses;
    if (body.expires_at !== undefined) updateData.expires_at = body.expires_at;

    const { data, error } = await supabase
      .from("coupons")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ coupon: data });
  } catch {
    return NextResponse.json({ error: "שגיאה בעדכון קופון" }, { status: 500 });
  }
}

// DELETE /api/coupons/[id] - Delete coupon
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase.from("coupons").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
