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
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://eng-tours.vercel.app";
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, share_token, events(name), participants(id, first_name_en, phone, email)")
    .eq("id", id)
    .single();
  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  const link = `${base}/p/${(order as any).share_token || id}`;

  const eventName = (order as any)?.events?.name || "אירוע";
  const participants = (order as any).participants || [];

  let sentEmail = 0, sentWA = 0;
  const errors: string[] = [];

  // EMAIL
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    for (const p of participants) {
      if (!p.email) continue;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "ENG TOURS <noreply@eng-tours.com>",
            to: [p.email],
            subject: `פרטי הזמנה - ${eventName}`,
            html: `<div dir="rtl" style="font-family:Arial,sans-serif">
              <h2 style="color:#DD9933">ENG TOURS</h2>
              <p>שלום ${p.first_name_en || ""},</p>
              <p>מצורפים פרטי ההזמנה שלך לאירוע <b>${eventName}</b>.</p>
              <p><a href="${link}" style="display:inline-block;background:#DD9933;color:white;padding:10px 20px;text-decoration:none;border-radius:6px">📄 הורד PDF</a></p>
            </div>`,
          }),
        });
        if (res.ok) sentEmail++;
        else errors.push(`email ${p.email}: HTTP ${res.status}`);
      } catch (e: any) { errors.push(`email ${p.email}: ${e.message}`); }
    }
  }

  // WHATSAPP
  if (isConfigured()) {
    const sr = await wasender.listSessions();
    const sessions: any[] = Array.isArray(sr.data) ? sr.data : ((sr.data as any)?.data || []);
    const session = sessions.find((s) => ["connected", "ready"].includes((s.status || "").toLowerCase()));
    if (session?.api_key) {
      const { renderTemplate } = await import("@/lib/wa-templates");
      for (const p of participants) {
        if (!p.phone) continue;
        const to = normalizePhone(p.phone);
        const text = await renderTemplate("order_details_buyers", { first_name: p.first_name_en || "", event_name: eventName, link });
        const r = await wasender.sendTextWithSessionKey(session.api_key, { to, text });
        if (r.ok) {
          sentWA++;
          await supabase.from("whatsapp_log").insert({
            direction: "outgoing", recipient: to.replace("+", ""), recipient_number: to.replace("+", ""),
            message_body: text, template_name: "order_details_buyers", status: "sent", order_id: id,
          });
        } else {
          errors.push(`wa ${p.phone}: ${r.error}`);
        }
        await new Promise((r) => setTimeout(r, 6000)); // Rate limit
      }
    }
  }

  await audit("buyers_notified", "order", id, {
    after: { link, sent_email: sentEmail, sent_whatsapp: sentWA, errors: errors.length ? errors : undefined },
  }, request);

  return NextResponse.json({ success: true, sent_email: sentEmail, sent_whatsapp: sentWA, errors });
}
