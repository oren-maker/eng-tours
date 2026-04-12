export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// POST /api/orders/[id]/merge - Merge another order into this one
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient();
  const targetId = params.id;

  try {
    const body = await request.json();
    const { source_order_id } = body;

    if (!source_order_id) {
      return NextResponse.json(
        { error: "נדרש מזהה הזמנת מקור" },
        { status: 400 }
      );
    }

    if (source_order_id === targetId) {
      return NextResponse.json(
        { error: "לא ניתן למזג הזמנה עם עצמה" },
        { status: 400 }
      );
    }

    // Fetch both orders
    const { data: targetOrder, error: targetError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", targetId)
      .single();

    const { data: sourceOrder, error: sourceError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", source_order_id)
      .single();

    if (targetError || !targetOrder) {
      return NextResponse.json(
        { error: "הזמנת יעד לא נמצאה" },
        { status: 404 }
      );
    }
    if (sourceError || !sourceOrder) {
      return NextResponse.json(
        { error: "הזמנת מקור לא נמצאה" },
        { status: 404 }
      );
    }

    // Both must be same event
    if (targetOrder.event_id !== sourceOrder.event_id) {
      return NextResponse.json(
        { error: "ניתן למזג רק הזמנות לאותו אירוע" },
        { status: 400 }
      );
    }

    // Move participants from source to target
    const { error: moveError } = await supabase
      .from("participants")
      .update({ order_id: targetId })
      .eq("order_id", source_order_id);

    if (moveError) {
      return NextResponse.json(
        { error: "שגיאה בהעברת משתתפים" },
        { status: 500 }
      );
    }

    // Update target order totals
    const newTotalPrice =
      Number(targetOrder.total_price || 0) +
      Number(sourceOrder.total_price || 0);
    const newAmountPaid =
      Number(targetOrder.amount_paid || 0) +
      Number(sourceOrder.amount_paid || 0);

    await supabase
      .from("orders")
      .update({
        total_price: newTotalPrice,
        amount_paid: newAmountPaid,
        internal_notes: targetOrder.internal_notes
          ? `${targetOrder.internal_notes}\n---\nמוזג עם הזמנה ${source_order_id.slice(0, 8)}`
          : `מוזג עם הזמנה ${source_order_id.slice(0, 8)}`,
      })
      .eq("id", targetId);

    // Cancel source order
    await supabase
      .from("orders")
      .update({
        status: "cancelled",
        internal_notes: sourceOrder.internal_notes
          ? `${sourceOrder.internal_notes}\n---\nמוזג לתוך הזמנה ${targetId.slice(0, 8)}`
          : `מוזג לתוך הזמנה ${targetId.slice(0, 8)}`,
      })
      .eq("id", source_order_id);

    // Audit log
    await supabase.from("audit_log").insert([
      {
        action: "order_merged",
        entity_type: "order",
        entity_id: targetId,
        after_data: {
          source_order_id,
          new_total_price: newTotalPrice,
        },
      },
      {
        action: "order_merged_source",
        entity_type: "order",
        entity_id: source_order_id,
        after_data: { merged_into: targetId },
      },
    ]);

    return NextResponse.json({
      message: "ההזמנות מוזגו בהצלחה",
      target_order_id: targetId,
    });
  } catch (err) {
    console.error("Merge error:", err);
    return NextResponse.json(
      { error: "שגיאה במיזוג הזמנות" },
      { status: 500 }
    );
  }
}
