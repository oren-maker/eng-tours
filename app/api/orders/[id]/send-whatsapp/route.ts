export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { wasender, isConfigured } from "@/lib/wasender";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

function normalizePhone(input: string) {
  let digits = (input || "").replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) digits = "972" + digits.slice(1);
  return "+" + digits;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { phone } = await request.json();
  if (!phone) return NextResponse.json({ error: "חסר טלפון" }, { status: 400 });
  if (!isConfigured()) return NextResponse.json({ error: "WaSender not configured" }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://eng-tours.vercel.app";
  const supabase = createServiceClient();
  const { data: order } = await supabase.from("orders").select("share_token, events(name)").eq("id", id).single();
  const link = `${base}/p/${(order as any)?.share_token || id}`;
  const eventName = (order as any)?.events?.name || "אירוע";

  // Find connected session
  const sessionsRes = await wasender.listSessions();
  if (!sessionsRes.ok) return NextResponse.json({ error: sessionsRes.error }, { status: 500 });
  const allSessions: any[] = Array.isArray(sessionsRes.data) ? sessionsRes.data : ((sessionsRes.data as any)?.data || []);
  const session = allSessions.find((s) => ["connected", "ready"].includes((s.status || "").toLowerCase()));
  if (!session?.api_key) return NextResponse.json({ error: "אין חשבון WhatsApp מחובר" }, { status: 400 });

  const to = normalizePhone(phone);
  const { renderTemplate } = await import("@/lib/wa-templates");
  const text = await renderTemplate("order_details", { event_name: eventName, link });

  const r = await wasender.sendTextWithSessionKey(session.api_key, { to, text });
  if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 500 });

  await supabase.from("whatsapp_log").insert({
    direction: "outgoing", recipient: to.replace("+", ""), recipient_number: to.replace("+", ""),
    message_body: text, template_name: "order_details", status: "sent", order_id: id,
  });
  await audit("whatsapp_sent", "order", id, { after: { recipient: to, template: "order_details" } }, request);
  return NextResponse.json({ success: true });
}
