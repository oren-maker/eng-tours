export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
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

  // Fetch participants with joined flight/room/ticket data
  const { data: participants, error: pErr } = await supabase
    .from("participants")
    .select(`
      *,
      flights(airline_name, flight_code, origin_iata, dest_iata, departure_time),
      rooms(room_type, check_in, check_out, hotels(name)),
      tickets(name)
    `)
    .eq("order_id", id);

  if (pErr) console.error("Participants fetch error:", pErr);

  // Fetch supplier confirmations
  const { data: supplierConfirmations, error: scErr } = await supabase
    .from("supplier_confirmations")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  if (scErr) console.error("Supplier confirmations error:", scErr);

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  // Collect IDs to query audit log: order + its supplier_confirmations
  const confIds = (supplierConfirmations || []).map((c: any) => c.id);
  const allEntityIds = [id, ...confIds];

  const { data: auditLog } = await supabase
    .from("audit_log")
    .select("*")
    .in("entity_id", allEntityIds)
    .order("created_at", { ascending: false })
    .limit(200);

  // Enrich with user display names
  const userIds = [...new Set((auditLog || []).map((a: any) => a.user_id).filter(Boolean))];
  const userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, display_name, email")
      .in("id", userIds);
    for (const u of users || []) {
      userMap[u.id] = u.display_name || u.email || "משתמש";
    }
  }
  const enrichedLog = (auditLog || []).map((a: any) => ({
    ...a,
    user_display_name: a.user_id ? userMap[a.user_id] || "משתמש" : "מערכת",
  }));

  const result = {
    ...order,
    event_name: (order.events as { name: string } | null)?.name || null,
    events: undefined,
    participants: participants || [],
    supplier_confirmations: supplierConfirmations || [],
    payments: payments || [],
    audit_log: enrichedLog,
  };

  return NextResponse.json(
    { order: result },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    },
  );
}
