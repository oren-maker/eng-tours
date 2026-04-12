import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getToken } from "next-auth/jwt";

// POST /api/orders/[id]/cancel - Cancel order (primary admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient();
  const { id } = params;

  // Verify primary admin
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== "admin") {
    return NextResponse.json(
      { error: "אין הרשאה" },
      { status: 403 }
    );
  }

  // Check if user is primary admin
  if (token.email) {
    const { data: user } = await supabase
      .from("users")
      .select("is_primary_admin")
      .eq("email", token.email)
      .single();

    if (!user?.is_primary_admin) {
      return NextResponse.json(
        { error: "רק אדמין ראשי יכול לבטל הזמנות" },
        { status: 403 }
      );
    }
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

  if (currentOrder.status === "cancelled") {
    return NextResponse.json(
      { error: "ההזמנה כבר מבוטלת" },
      { status: 400 }
    );
  }

  // Cancel the order
  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_by: token.sub || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: "שגיאה בביטול ההזמנה" },
      { status: 500 }
    );
  }

  // Restore stock: get participants and reverse their bookings
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

  // Audit log
  await supabase.from("audit_log").insert({
    action: "order_cancelled",
    entity_type: "order",
    entity_id: id,
    user_id: token.sub || null,
    before_data: { status: currentOrder.status },
    after_data: { status: "cancelled" },
  });

  return NextResponse.json({ order: updatedOrder });
}
