export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { share_token, participant_id, amount, method, card_last4, confirmation, date } = body;

  if (!share_token || !participant_id || !amount) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }

  const { data: order } = await supabase.from("orders").select("id, amount_paid, total_price").eq("share_token", share_token).single();
  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });

  const { data: existing } = await supabase
    .from("participants")
    .select("id, order_id, amount_paid")
    .eq("id", participant_id)
    .eq("order_id", order.id)
    .single();

  if (!existing) return NextResponse.json({ error: "משתתף לא נמצא" }, { status: 404 });

  const newAmount = Number(existing.amount_paid || 0) + Number(amount);
  const { error } = await supabase
    .from("participants")
    .update({
      amount_paid: newAmount,
      payment_method: method || null,
      payment_card_last4: card_last4 || null,
      payment_confirmation: confirmation || null,
      payment_date: date || null,
      payer_participant_id: participant_id,
    })
    .eq("id", participant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const newOrderPaid = Number(order.amount_paid || 0) + Number(amount);
  const orderUpdate: any = { amount_paid: newOrderPaid };
  if (newOrderPaid >= Number(order.total_price || 0)) orderUpdate.status = "completed";
  else if (newOrderPaid > 0) orderUpdate.status = "partial";
  await supabase.from("orders").update(orderUpdate).eq("id", order.id);

  await audit("payment_added", "order", order.id, {
    after: { participant_id, amount, method, card_last4, confirmation, date, total_paid: newOrderPaid },
  }, request);

  return NextResponse.json({ success: true });
}
