import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET /api/orders/[id] - Single order detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient();
  const { id } = params;

  // Fetch order with event name
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, events(name)")
    .eq("id", id)
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
    .select("*")
    .eq("order_id", id)
    .order("created_at" as never, { ascending: true });

  // Fetch supplier confirmations
  const { data: supplierConfirmations } = await supabase
    .from("supplier_confirmations")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  // Fetch audit log entries for this order
  const { data: auditLog } = await supabase
    .from("audit_log")
    .select("*")
    .eq("entity_type", "order")
    .eq("entity_id", id)
    .order("created_at", { ascending: false });

  const result = {
    ...order,
    event_name: (order.events as { name: string } | null)?.name || null,
    events: undefined,
    participants: participants || [],
    supplier_confirmations: supplierConfirmations || [],
    audit_log: auditLog || [],
  };

  return NextResponse.json({ order: result });
}
