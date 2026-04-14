export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { verifyEmailToken } from "@/lib/unsubscribe-token";

export async function POST(request: Request) {
  const { email, token, reason } = await request.json();
  if (!email) return NextResponse.json({ error: "חסר מייל" }, { status: 400 });
  if (!verifyEmailToken(email, token || "")) return NextResponse.json({ error: "קישור לא תקין" }, { status: 403 });
  const supabase = createServiceClient();
  await supabase.from("email_unsubscribes").upsert({
    email: email.toLowerCase().trim(),
    reason: reason || null,
    unsubscribed_at: new Date().toISOString(),
    source: "unsubscribe_link",
  });
  return NextResponse.json({ success: true });
}
