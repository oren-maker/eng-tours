export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("email_unsubscribes").select("*").order("unsubscribed_at", { ascending: false });
  return NextResponse.json({ items: data || [] });
}

export async function DELETE(request: Request) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "חסר מייל" }, { status: 400 });
  const supabase = createServiceClient();
  await supabase.from("email_unsubscribes").delete().eq("email", email.toLowerCase().trim());
  return NextResponse.json({ success: true });
}
