export const revalidate = 120;
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();

  // All confirmations with has_issue=true
  const { data: issues, error } = await supabase
    .from("supplier_confirmations")
    .select("*")
    .eq("has_issue", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with order + event info
  const orderIds = [...new Set((issues || []).map((i) => i.order_id))];
  if (orderIds.length === 0) return NextResponse.json([]);

  const { data: orders } = await supabase
    .from("orders")
    .select("id, event_id, status, total_price, events(name), participants(first_name_en, last_name_en)")
    .in("id", orderIds);

  const orderMap: Record<string, any> = {};
  for (const o of orders || []) orderMap[o.id] = o;

  const enriched = (issues || []).map((i) => ({
    ...i,
    order: orderMap[i.order_id] || null,
  }));

  return NextResponse.json(enriched);
}
