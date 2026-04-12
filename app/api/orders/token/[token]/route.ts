import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET /api/orders/token/[token] - Get order by share_token (public)
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient();
  const { token } = params;

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, events(name, start_date, end_date)")
    .eq("share_token", token)
    .single();

  if (error || !order) {
    return NextResponse.json(
      { error: "הזמנה לא נמצאה" },
      { status: 404 }
    );
  }

  // Fetch participants
  const { data: participants } = await supabase
    .from("participants")
    .select(
      "id, first_name_en, last_name_en, phone, email, flight_id, room_id, ticket_id, package_id, amount_paid"
    )
    .eq("order_id", order.id);

  // Public view - limited info
  const result = {
    id: order.id,
    event_id: order.event_id,
    event_name: (order.events as { name: string } | null)?.name || null,
    event_start_date: (order.events as { start_date: string } | null)?.start_date || null,
    event_end_date: (order.events as { end_date: string } | null)?.end_date || null,
    status: order.status,
    mode: order.mode,
    total_price: order.total_price,
    amount_paid: order.amount_paid,
    created_at: order.created_at,
    participants: participants || [],
  };

  return NextResponse.json({ order: result });
}
