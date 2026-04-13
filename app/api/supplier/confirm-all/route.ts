export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { share_token, items } = body;

  if (!share_token || !Array.isArray(items)) {
    return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  }

  // Find order by share_token
  const { data: order } = await supabase.from("orders").select("id, status").eq("share_token", share_token).single();
  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });

  let hasAnyIssue = false;

  for (const item of items) {
    if (!item.confirmation_number && !item.has_issue) continue; // skip empty

    await supabase.from("supplier_confirmations").insert({
      order_id: order.id,
      item_type: item.item_type,
      item_id: item.item_id,
      confirmation_number: item.confirmation_number || null,
      notes: item.notes || null,
      has_issue: !!item.has_issue,
    });

    if (item.has_issue) hasAnyIssue = true;
  }

  // Update order status - supplier confirms → completed
  const newStatus = hasAnyIssue ? "supplier_review" : "completed";
  const updateData: any = {
    status: newStatus,
    supplier_viewed_at: new Date().toISOString(),
  };
  if (!hasAnyIssue) {
    updateData.supplier_approved_at = new Date().toISOString();
    updateData.confirmed_at = new Date().toISOString();
  }

  await supabase.from("orders").update(updateData).eq("id", order.id);

  await audit("supplier_confirm_all", "order", order.id, {
    after: { status: newStatus, items_count: items.length, has_issue: hasAnyIssue },
  }, request);

  return NextResponse.json({ success: true, status: newStatus });
}
