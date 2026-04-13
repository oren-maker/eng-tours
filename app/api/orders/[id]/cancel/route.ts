export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getToken } from "next-auth/jwt";

// POST /api/orders/[id]/cancel - Cancel order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServiceClient();
  const { id } = await params;

  // Parse body for optional cancellation fee
  let cancellation_fee_percent = 0;
  try {
    const body = await request.json();
    if (typeof body?.cancellation_fee_percent === "number") {
      cancellation_fee_percent = body.cancellation_fee_percent;
    }
  } catch { /* no body */ }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Fetch current order
  const { data: currentOrder, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !currentOrder) {
    return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  }

  if (currentOrder.status === "cancelled") {
    return NextResponse.json({ error: "ההזמנה כבר מבוטלת" }, { status: 400 });
  }

  // Calculate cancellation fee amount
  const feeAmount = (Number(currentOrder.total_price) || 0) * (cancellation_fee_percent / 100);
  const refundAmount = (Number(currentOrder.amount_paid) || 0) - feeAmount;

  // Build internal_notes entry
  const feeNote = cancellation_fee_percent > 0
    ? `\n[${new Date().toLocaleString("he-IL")}] בוטל עם דמי ביטול ${cancellation_fee_percent}% (₪${feeAmount.toFixed(0)}). החזר: ₪${refundAmount.toFixed(0)}`
    : `\n[${new Date().toLocaleString("he-IL")}] בוטל ללא דמי ביטול`;

  // Cancel the order
  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_by: token?.sub || null,
      internal_notes: (currentOrder.internal_notes || "") + feeNote,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("Cancel error:", updateError);
    return NextResponse.json({ error: updateError.message || "שגיאה בביטול ההזמנה" }, { status: 500 });
  }

  // Restore stock
  const { data: participants } = await supabase
    .from("participants")
    .select("flight_id, room_id, ticket_id")
    .eq("order_id", id);

  if (participants) {
    for (const p of participants) {
      if (p.flight_id) {
        const { data: flight } = await supabase
          .from("flights")
          .select("booked_seats")
          .eq("id", p.flight_id)
          .single();
        if (flight && flight.booked_seats > 0) {
          await supabase
            .from("flights")
            .update({ booked_seats: flight.booked_seats - 1 })
            .eq("id", p.flight_id);
        }
      }
      if (p.room_id) {
        const { data: room } = await supabase
          .from("rooms")
          .select("booked_rooms")
          .eq("id", p.room_id)
          .single();
        if (room && room.booked_rooms > 0) {
          await supabase
            .from("rooms")
            .update({ booked_rooms: room.booked_rooms - 1 })
            .eq("id", p.room_id);
        }
      }
      if (p.ticket_id) {
        const { data: ticket } = await supabase
          .from("tickets")
          .select("booked_qty")
          .eq("id", p.ticket_id)
          .single();
        if (ticket && ticket.booked_qty > 0) {
          await supabase
            .from("tickets")
            .update({ booked_qty: ticket.booked_qty - 1 })
            .eq("id", p.ticket_id);
        }
      }
    }
  }

  await supabase.from("audit_log").insert({
    action: "order_cancelled",
    entity_type: "order",
    entity_id: id,
    user_id: token?.sub || null,
    before_data: { status: currentOrder.status },
    after_data: { status: "cancelled", cancellation_fee_percent, refund_amount: refundAmount },
  });

  return NextResponse.json({ order: updatedOrder, cancellation_fee_percent, fee_amount: feeAmount, refund_amount: refundAmount });
}
