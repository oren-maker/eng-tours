export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { verifyEmailToken } from "@/lib/unsubscribe-token";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { unsubscribeSchema, parseOrFail } from "@/lib/schemas";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`unsubscribe:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "יותר מדי ניסיונות, נסה שוב בעוד רגע" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }
  const parsed = parseOrFail(unsubscribeSchema, await request.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { email, token, reason } = parsed.data;
  if (!verifyEmailToken(email, token)) return NextResponse.json({ error: "קישור לא תקין" }, { status: 403 });
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
