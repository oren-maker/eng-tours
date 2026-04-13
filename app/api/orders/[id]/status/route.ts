export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

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

    if (status && !VALID_STATUSES.includes(status)) {
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

    // Business rule: Cannot mark as "confirmed" without supplier_approved first
    if (status === "confirmed" && currentOrder.status !== "supplier_approved") {
      return NextResponse.json(
        { error: "לא ניתן לאשר הזמנה סופית ללא אישור ספק. יש לעבור דרך supplier_approved תחילה" },
        { status: 400 }
      );
    }

    // Business rule: Check age if event has min_age
    if (status === "confirmed" || status === "supplier_approved") {
      const { data: ev } = await supabase.from("events").select("min_age").eq("id", currentOrder.event_id).single();
      if (ev?.min_age) {
        const { data: participants } = await supabase
          .from("participants")
          .select("birth_date")
          .eq("order_id", id);
        const today = new Date();
        for (const p of participants || []) {
          if (!p.birth_date) continue;
          const age = Math.floor((today.getTime() - new Date(p.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          if (age < ev.min_age) {
            return NextResponse.json(
              { error: `לא ניתן לאשר - יש נוסע מתחת לגיל ${ev.min_age} (בן ${age})` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (internal_notes !== undefined) updateData.internal_notes = internal_notes;
    if (status === "confirmed") updateData.confirmed_at = new Date().toISOString();
    if (status === "supplier_approved") updateData.supplier_approved_at = new Date().toISOString();

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "אין שינויים" }, { status: 400 });
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

    // Audit log: separate entries for status change and note change
    const statusChanged = status && currentOrder.status !== status;
    const noteChanged = internal_notes !== undefined && internal_notes !== currentOrder.internal_notes;

    if (statusChanged) {
      await audit("order_status_changed", "order", id, {
        before: { status: currentOrder.status },
        after: { status },
      }, request);
    }
    if (noteChanged) {
      const prev = currentOrder.internal_notes || "";
      const next = internal_notes || "";
      const added = next.length > prev.length ? next.slice(prev.length).replace(/^\n?---\n?/, "") : next;
      await audit("note_added", "order", id, {
        before: { internal_notes: prev },
        after: { internal_notes: next, added_note: added },
      }, request);
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (err) {
    console.error("Status change error:", err);
    return NextResponse.json(
      { error: "שגיאה בעדכון סטטוס" },
      { status: 500 }
    );
  }
}
