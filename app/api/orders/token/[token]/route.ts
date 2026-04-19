export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { hydratePassportNumbers } from "@/lib/pii-participants";

// GET /api/orders/token/[token] - Get order by share_token (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(request);
  const rl = rateLimit(`order-token:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "יותר מדי בקשות" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }
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
      id, first_name_en, last_name_en, phone, email, passport_number, passport_number_enc,
      flight_id, room_id, ticket_id, package_id, amount_paid,
      flights(airline_name, flight_code, origin_iata, dest_iata, departure_time, price_customer),
      rooms(room_type, check_in, check_out, price_customer, hotels(name)),
      tickets(name, price_customer)
    `)
    .eq("order_id", order.id);

  // Include existing supplier confirmations
  const { data: supplierConfirmations } = await supabase
    .from("supplier_confirmations")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false });

  const { data: payments } = await supabase
    .from("payments")
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
    participants: hydratePassportNumbers(participants || []),
    supplier_confirmations: supplierConfirmations || [],
    payments: payments || [],
  });
}
