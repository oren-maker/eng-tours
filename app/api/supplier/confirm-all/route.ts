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

  const { data: order } = await supabase.from("orders").select("id, status").eq("share_token", share_token).single();
  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });

  // Load existing confirmations to detect changes
  const { data: existing } = await supabase
    .from("supplier_confirmations")
    .select("*")
    .eq("order_id", order.id);

  let hasAnyIssue = false;
  const changes: any[] = [];

  for (const item of items) {
    if (!item.confirmation_number && !item.has_issue) continue;

    const prev = (existing || []).find(
      (e: any) => e.item_type === item.item_type && e.item_id === item.item_id
    );

    if (prev) {
      // Update existing - check for changes
      const diffs: Record<string, { from: any; to: any }> = {};
      if (prev.confirmation_number !== item.confirmation_number) {
        diffs.confirmation_number = { from: prev.confirmation_number, to: item.confirmation_number };
      }
      if ((prev.notes || "") !== (item.notes || "")) {
        diffs.notes = { from: prev.notes, to: item.notes };
      }
      if (!!prev.has_issue !== !!item.has_issue) {
        diffs.has_issue = { from: prev.has_issue, to: item.has_issue };
      }

      if (Object.keys(diffs).length > 0) {
        await supabase
          .from("supplier_confirmations")
          .update({
            confirmation_number: item.confirmation_number || null,
            notes: item.notes || null,
            has_issue: !!item.has_issue,
          })
          .eq("id", prev.id);

        changes.push({
          type: item.item_type,
          action: "updated",
          diffs,
        });
      }
    } else {
      // Insert new
      await supabase.from("supplier_confirmations").insert({
        order_id: order.id,
        item_type: item.item_type,
        item_id: item.item_id,
        confirmation_number: item.confirmation_number || null,
        notes: item.notes || null,
        has_issue: !!item.has_issue,
      });
      changes.push({
        type: item.item_type,
        action: "created",
        confirmation_number: item.confirmation_number,
      });
    }

    if (item.has_issue) hasAnyIssue = true;
  }

  // Update order status: approved → completed, issue → supplier_review
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

  // Audit log with full change details
  await audit("supplier_confirm", "order", order.id, {
    after: {
      status: newStatus,
      items_count: items.length,
      has_issue: hasAnyIssue,
      changes,
    },
  }, request);

  return NextResponse.json({ success: true, status: newStatus, changes });
}
