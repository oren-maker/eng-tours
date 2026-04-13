import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET /api/orders/token/[token] - Get order by share_token (public)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = createServiceClient();
  const { token } = await params;

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, events(name, start_date, end_date)")
    .eq("share_token", token)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  }

  const { data: participants } = await supabase
    .from("participants")
    .select(`
      id, first_name_en, last_name_en, phone, email, passport_number,
      flight_id, room_id, ticket_id, package_id, amount_paid,
      flights(airline_name, flight_code, origin_iata, dest_iata, departure_time),
      rooms(room_type, check_in, check_out, hotels(name)),
      tickets(name)
    `)
    .eq("order_id", order.id);

  // Include existing supplier confirmations
  const { data: supplierConfirmations } = await supabase
    .from("supplier_confirmations")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    id: order.id,
    event_id: order.event_id,
    events: order.events,
    status: order.status,
    mode: order.mode,
    total_price: order.total_price,
    amount_paid: order.amount_paid,
    created_at: order.created_at,
    participants: participants || [],
    supplier_confirmations: supplierConfirmations || [],
  });
}
