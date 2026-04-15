export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);
  const orderId = searchParams.get("order_id");
  const email = searchParams.get("email");

  const supabase = createServiceClient();
  let q = supabase.from("email_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (orderId) q = q.eq("order_id", orderId);
  if (email) q = q.eq("recipient_email", email.toLowerCase().trim());
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ logs: data || [] });
}
