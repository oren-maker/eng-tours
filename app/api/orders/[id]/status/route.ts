export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const VALID_STATUSES = [
  "draft",
  "pending_payment",
  "partial",
  "completed",
  "supplier_review",
  "supplier_approved",
  "confirmed",
  "cancelled",
];

// PATCH /api/orders/[id]/status - Change order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient();
  const { id } = params;

  try {
    const body = await request.json();
    const { status, internal_notes } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "סטטוס לא תקין" },
        { status: 400 }
      );
    }

    // Fetch current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json(
        { error: "הזמנה לא נמצאה" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = { status };

    if (internal_notes !== undefined) {
      updateData.internal_notes = internal_notes;
    }

    if (status === "confirmed") {
      updateData.confirmed_at = new Date().toISOString();
    }
    if (status === "supplier_approved") {
      updateData.supplier_approved_at = new Date().toISOString();
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "שגיאה בעדכון סטטוס" },
        { status: 500 }
      );
    }

    // Audit log
    await supabase.from("audit_log").insert({
      action: "order_status_changed",
      entity_type: "order",
      entity_id: id,
      before_data: { status: currentOrder.status },
      after_data: { status },
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (err) {
    console.error("Status change error:", err);
    return NextResponse.json(
      { error: "שגיאה בעדכון סטטוס" },
      { status: 500 }
    );
  }
}
