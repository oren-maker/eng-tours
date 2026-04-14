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

  const PAYMENT_FIELDS = [
    "payment_amount", "payment_currency", "payment_method",
    "payment_installments", "payment_confirmation", "payment_date", "payment_due_date",
  ];

  for (const item of items) {
    const hasPayment = PAYMENT_FIELDS.some((f) => item[f] != null && item[f] !== "");
    if (!item.confirmation_number && !item.has_issue && !hasPayment) continue;

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

      if (prev.issue_description !== item.issue_description) {
        diffs.issue_description = { from: prev.issue_description, to: item.issue_description };
      }
      for (const f of PAYMENT_FIELDS) {
        const a = prev[f] == null ? null : prev[f];
        const b = item[f] == null || item[f] === "" ? null : item[f];
        if (String(a) !== String(b)) {
          diffs[f] = { from: a, to: b };
        }
      }

      if (Object.keys(diffs).length > 0) {
        await supabase
          .from("supplier_confirmations")
          .update({
            confirmation_number: item.confirmation_number || null,
            notes: item.notes || null,
            has_issue: !!item.has_issue,
            issue_description: item.issue_description || null,
            payment_amount: item.payment_amount ?? null,
            payment_currency: item.payment_currency || null,
            payment_method: item.payment_method || null,
            payment_installments: item.payment_installments ?? null,
            payment_confirmation: item.payment_confirmation || null,
            payment_date: item.payment_date || null,
            payment_due_date: item.payment_due_date || null,
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
        issue_description: item.issue_description || null,
        payment_amount: item.payment_amount ?? null,
        payment_currency: item.payment_currency || null,
        payment_method: item.payment_method || null,
        payment_installments: item.payment_installments ?? null,
        payment_confirmation: item.payment_confirmation || null,
        payment_date: item.payment_date || null,
        payment_due_date: item.payment_due_date || null,
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

  // Send supplier notifications
  try {
    const { sendTemplateMessage, getAdminPhone } = await import("@/lib/wa-templates");
    const adminPhone = await getAdminPhone();
    const orderShortId = order.id.slice(0, 8);
    if (adminPhone) {
      if (hasAnyIssue) {
        await sendTemplateMessage("supplier_issue", adminPhone, { name: "ספק", id: orderShortId }, { order_id: order.id, recipient_type: "admin" });
      } else {
        await sendTemplateMessage("supplier_approved", adminPhone, { name: "ספק", id: orderShortId }, { order_id: order.id, recipient_type: "admin" });
        await new Promise((r) => setTimeout(r, 6000));
        // Send airline confirmation to customers for flight items
        const flightConf = changes.find((c: any) => c.type === "flight")?.confirmation_number;
        if (flightConf) {
          const { data: parts } = await supabase.from("participants").select("phone").eq("order_id", order.id);
          for (const p of parts || []) {
            if ((p as any).phone) {
              await sendTemplateMessage("order_confirmed_airline", (p as any).phone, { confirmation: flightConf }, { order_id: order.id, recipient_type: "customer" });
              await new Promise((r) => setTimeout(r, 6000));
            }
          }
        }
      }
    }
  } catch (e) { console.error("supplier notify error:", e); }

  return NextResponse.json({ success: true, status: newStatus, changes });
}
