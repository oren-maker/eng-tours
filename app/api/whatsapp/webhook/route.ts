export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import crypto from "crypto";

const SECRET = process.env.WASENDER_WEBHOOK_SECRET || "";

function timingSafeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function POST(request: Request) {
  // Require webhook secret (fail closed)
  if (!SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }
  const sig = request.headers.get("x-webhook-signature") || request.headers.get("x-signature") || "";
  if (!sig || !timingSafeEq(sig, SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Common WaSender event payload shape: { event, sessionId, data: { from, body/text, ... } }
  const event = body?.event || body?.type || "unknown";
  const data = body?.data || body;

  if (event.includes("messages.received") || event.includes("message.received") || event === "message") {
    const from = data?.from || data?.sender || data?.chatId || "";
    const text = data?.body || data?.text || data?.message?.text || data?.message || "";
    const messageId = data?.id || data?.messageId || null;

    await supabase.from("whatsapp_log").insert({
      direction: "incoming",
      recipient: from.replace(/[^0-9]/g, "").replace(/^.*?(\d+)$/, "$1"),
      message_body: typeof text === "string" ? text : JSON.stringify(text),
      status: "delivered",
      external_id: messageId,
      raw_payload: body,
    });
  } else {
    // Log unknown events too for debugging
    await supabase.from("whatsapp_log").insert({
      direction: "incoming",
      recipient: "system",
      message_body: `Event: ${event}`,
      status: "delivered",
      raw_payload: body,
    });
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "WaSender webhook endpoint" });
}
