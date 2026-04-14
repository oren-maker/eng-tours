export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

const VALID_STATUSES = [
  "draft",
  "pending_payment",
  "partial",
  "completed",
  "supplier_review",
  "supplier_approved",
  "confirmed",
  "cancelled",
];

// PATCH /api/orders/[id]/status - Change order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient();
  const { id } = params;

  try {
    const body = await request.json();
    const { status, internal_notes } = body;

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "סטטוס לא תקין" },
        { status: 400 }
      );
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

    // Business rule: Cannot mark as "confirmed" without supplier_approved first
    if (status === "confirmed" && currentOrder.status !== "supplier_approved") {
      return NextResponse.json(
        { error: "לא ניתן לאשר הזמנה סופית ללא אישור ספק. יש לעבור דרך supplier_approved תחילה" },
        { status: 400 }
      );
    }

    // Business rule: Check age if event has min_age
    if (status === "confirmed" || status === "supplier_approved") {
      const { data: ev } = await supabase.from("events").select("min_age").eq("id", currentOrder.event_id).single();
      if (ev?.min_age) {
        const { data: participants } = await supabase
          .from("participants")
          .select("birth_date")
          .eq("order_id", id);
        const today = new Date();
        for (const p of participants || []) {
          if (!p.birth_date) continue;
          const age = Math.floor((today.getTime() - new Date(p.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          if (age < ev.min_age) {
            return NextResponse.json(
              { error: `לא ניתן לאשר - יש נוסע מתחת לגיל ${ev.min_age} (בן ${age})` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (internal_notes !== undefined) updateData.internal_notes = internal_notes;
    if (status === "confirmed") updateData.confirmed_at = new Date().toISOString();
    if (status === "supplier_approved") updateData.supplier_approved_at = new Date().toISOString();

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "אין שינויים" }, { status: 400 });
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "שגיאה בעדכון סטטוס" },
        { status: 500 }
      );
    }

    // Audit log: separate entries for status change and note change
    const statusChanged = status && currentOrder.status !== status;
    const noteChanged = internal_notes !== undefined && internal_notes !== currentOrder.internal_notes;

    if (statusChanged) {
      await audit("order_status_changed", "order", id, {
        before: { status: currentOrder.status },
        after: { status },
      }, request);

      // Fire template notifications based on new status
      try {
        const { sendTemplateMessage, getAdminPhone } = await import("@/lib/wa-templates");
        const base = process.env.NEXT_PUBLIC_BASE_URL || "https://eng-tours.vercel.app";
        const { data: fullOrder } = await supabase
          .from("orders")
          .select("id, share_token, event_id, events(name), participants(phone, first_name_en)")
          .eq("id", id)
          .single();
        const ev: any = (fullOrder as any)?.events;
        const eventName = ev?.name || "האירוע";
        const link = `${base}/p/${(fullOrder as any)?.share_token || id}`;
        const orderShortId = id.slice(0, 8);
        const customerPhones = new Set<string>(((fullOrder as any)?.participants || []).map((p: any) => p.phone).filter(Boolean));
        const supplierLink = `${base}/supplier/order/${(fullOrder as any)?.share_token}`;
        const adminPhone = await getAdminPhone();

        if (status === "confirmed") {
          for (const p of Array.from(customerPhones)) {
            await sendTemplateMessage("order_confirmed_customer", p, { link }, { order_id: id, recipient_type: "customer" });
            await new Promise((r) => setTimeout(r, 6000));
          }
        } else if (status === "supplier_review") {
          // Notify admin + send supplier flow notifications
          if (adminPhone) {
            await sendTemplateMessage("supplier_new_order", adminPhone, { order_id: orderShortId, event_name: eventName, link: supplierLink }, { order_id: id, recipient_type: "admin" });
            await new Promise((r) => setTimeout(r, 6000));
            await sendTemplateMessage("order_pending_supplier", adminPhone, { id: orderShortId, link: supplierLink }, { order_id: id, recipient_type: "supplier" });
            await new Promise((r) => setTimeout(r, 6000));
          }
        }
      } catch (e) { console.error("status notify error:", e); }
    }
    if (noteChanged) {
      const prev = currentOrder.internal_notes || "";
      const next = internal_notes || "";
      const added = next.length > prev.length ? next.slice(prev.length).replace(/^\n?---\n?/, "") : next;
      await audit("note_added", "order", id, {
        before: { internal_notes: prev },
        after: { internal_notes: next, added_note: added },
      }, request);
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (err) {
    console.error("Status change error:", err);
    return NextResponse.json(
      { error: "שגיאה בעדכון סטטוס" },
      { status: 500 }
    );
  }
}
