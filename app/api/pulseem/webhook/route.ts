export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import crypto from "crypto";

const SECRET = process.env.PULSEEM_WEBHOOK_SECRET || "";

function timingSafeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Pulseem delivery status webhook.
// Register cbkUrl: https://eng-tours.vercel.app/api/pulseem/webhook?token=<PULSEEM_WEBHOOK_SECRET>
// Expected body shape (Pulseem DLR): { sendId, msisdn, status, statusCode, timestamp }
export async function POST(request: Request) {
  if (!SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || request.headers.get("x-webhook-token") || "";
  if (!token || !timingSafeEq(token, SECRET)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let body: any = null;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const supabase = createServiceClient();

  // Accept single record or array of records
  const records = Array.isArray(body) ? body : body?.items || body?.records || [body];
  const now = new Date().toISOString();

  for (const rec of records) {
    if (!rec || typeof rec !== "object") continue;
    const sendId = rec.sendId || rec.reference || rec.id || null;
    const rawStatus = String(rec.status || rec.messageStatus || rec.statusCode || "").toLowerCase();
    if (!sendId) continue;

    const isDelivered = rawStatus.includes("delivered") || rawStatus === "dlvrd" || rawStatus === "2";
    const isFailed = rawStatus.includes("failed") || rawStatus.includes("rejected") || rawStatus === "undeliv";

    const patch: any = { raw: rec };
    if (isDelivered) { patch.status = "delivered"; patch.delivered_at = now; }
    else if (isFailed) { patch.status = "failed"; patch.error = rec.statusDescription || rec.error || rawStatus; }

    await supabase.from("sms_log").update(patch).eq("external_id", String(sendId));
  }

  return NextResponse.json({ success: true, processed: records.length });
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "Pulseem DLR webhook" });
}
