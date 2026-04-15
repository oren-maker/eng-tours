export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { verifyEmailToken } from "@/lib/unsubscribe-token";

export async function POST(request: Request) {
  const { email, token, reason } = await request.json();
  if (!email) return NextResponse.json({ error: "חסר מייל" }, { status: 400 });
  if (!verifyEmailToken(email, token || "")) return NextResponse.json({ error: "קישור לא תקין" }, { status: 403 });
  const supabase = createServiceClient();
  const normalized = email.toLowerCase().trim();
  await supabase.from("email_unsubscribes").upsert({
    email: normalized,
    reason: reason || null,
    unsubscribed_at: new Date().toISOString(),
    source: "unsubscribe_link",
  });
  await supabase.from("email_unsubscribe_log").insert({
    email: normalized,
    event_type: "unsubscribed",
    reason: reason || null,
    source: "unsubscribe_link",
  });
  return NextResponse.json({ success: true });
}
