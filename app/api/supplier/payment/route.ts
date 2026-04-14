export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { share_token, participant_id, amount, method, card_last4, confirmation, date } = body;

  if (!share_token || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }

  const { data: order } = await supabase.from("orders").select("id, amount_paid, total_price").eq("share_token", share_token).single();
  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });

  const total = Number(order.total_price || 0);
  const paid = Number(order.amount_paid || 0);
  const remaining = total - paid;
  if (remaining <= 0) {
    return NextResponse.json({ error: "ההזמנה שולמה במלואה" }, { status: 400 });
  }

  const amt = Math.min(Number(amount), remaining);

  await supabase.from("payments").insert({
    order_id: order.id,
    participant_id: participant_id || null,
    amount: amt,
    method: method || null,
    card_last4: card_last4 || null,
    confirmation: confirmation || null,
    payment_date: date || null,
  });

  if (participant_id) {
    const { data: p } = await supabase.from("participants").select("amount_paid").eq("id", participant_id).single();
    await supabase.from("participants").update({
      amount_paid: Number(p?.amount_paid || 0) + amt,
      payment_method: method || null,
      payment_card_last4: card_last4 || null,
      payment_confirmation: confirmation || null,
      payment_date: date || null,
    }).eq("id", participant_id);
  }


  const newPaid = paid + amt;
  const orderUpdate: any = { amount_paid: newPaid };
  if (newPaid >= total) orderUpdate.status = "completed";
  else if (newPaid > 0) orderUpdate.status = "partial";
  await supabase.from("orders").update(orderUpdate).eq("id", order.id);

  await audit("payment_added", "order", order.id, {
    after: { participant_id: participant_id || null, amount: amt, method, card_last4, confirmation, date, total_paid: newPaid, remaining_after: total - newPaid },
  }, request);

  // Send payment notification
  try {
    const { sendTemplateMessage } = await import("@/lib/wa-templates");
    const { data: fullOrder } = await supabase
      .from("orders")
      .select("events(name), participants(phone)")
      .eq("id", order.id)
      .single();
    const eventName = (fullOrder as any)?.events?.name || "האירוע";
    const phones = new Set<string>(((fullOrder as any)?.participants || []).map((p: any) => p.phone).filter(Boolean));
    const orderShortId = order.id.slice(0, 8);
    const templateName = newPaid >= total ? "payment_confirmed" : "partial_payment";
    for (const phone of Array.from(phones)) {
      if (templateName === "payment_confirmed") {
        await sendTemplateMessage("payment_confirmed", phone, { event_name: eventName, amount: amt, order_id: orderShortId }, { order_id: order.id, recipient_type: "customer" });
      } else {
        await sendTemplateMessage("partial_payment", phone, { id: orderShortId }, { order_id: order.id, recipient_type: "customer" });
      }
      await new Promise((r) => setTimeout(r, 6000));
    }
  } catch (e) { console.error("payment notify error:", e); }

  return NextResponse.json({ success: true, amount_paid: amt, remaining: total - newPaid });
}
