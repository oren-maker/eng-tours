export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("email_unsubscribes").select("*").order("unsubscribed_at", { ascending: false });
  return NextResponse.json({ items: data || [] });
}

export async function DELETE(request: Request) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "חסר מייל" }, { status: 400 });
  const normalized = email.toLowerCase().trim();
  const supabase = createServiceClient();
  const session = await getServerSession(authOptions);
  const actor = (session?.user as any)?.id || null;
  await supabase.from("email_unsubscribe_log").insert({
    email: normalized,
    event_type: "resubscribed",
    source: "admin",
    actor_user_id: actor,
  });
  await supabase.from("email_unsubscribes").delete().eq("email", normalized);
  return NextResponse.json({ success: true });
}
