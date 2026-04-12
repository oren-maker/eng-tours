import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET /api/payments/[token] - Get participant payment info by payment_token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient();
  const { token } = params;

  // Find participant by payment_token
  const { data: participant, error } = await supabase
    .from("participants")
    .select("*")
    .eq("payment_token", token)
    .single();

  if (error || !participant) {
    return NextResponse.json(
      { error: "קישור תשלום לא תקין" },
      { status: 404 }
    );
  }

  // Fetch order details
  const { data: order } = await supabase
    .from("orders")
    .select("*, events(name, start_date, end_date)")
    .eq("id", participant.order_id)
    .single();

  if (!order) {
    return NextResponse.json(
      { error: "הזמנה לא נמצאה" },
      { status: 404 }
    );
  }

  // Calculate this participant's share
  const { data: allParticipants } = await supabase
    .from("participants")
    .select("id")
    .eq("order_id", participant.order_id);

  const participantCount = allParticipants?.length || 1;
  const participantShare = Number(order.total_price) / participantCount;

  const eventData = order.events as { name: string; start_date: string; end_date: string } | null;

  return NextResponse.json({
    participant: {
      id: participant.id,
      first_name_en: participant.first_name_en,
      last_name_en: participant.last_name_en,
      phone: participant.phone,
      email: participant.email,
      amount_paid: participant.amount_paid,
      order_id: order.id,
      order_total: order.total_price,
      order_status: order.status,
      event_name: eventData?.name || order.event_id,
      event_start_date: eventData?.start_date || null,
      event_end_date: eventData?.end_date || null,
      participant_share: Math.round(participantShare * 100) / 100,
    },
  });
}
