export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { email } = body;
  if (!email) return NextResponse.json({ error: "חסר מייל" }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://eng-tours.vercel.app";
  const link = `${base}/orders/${id}/print`;

  const supabase = createServiceClient();
  const { data: order } = await supabase.from("orders").select("id, events(name)").eq("id", id).single();
  const eventName = (order as any)?.events?.name || "אירוע";

  // Try Resend if configured, else fall back to logging
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "ENG Tours <noreply@eng-tours.com>",
          to: [email],
          subject: `פרטי הזמנה - ${eventName}`,
          html: `<div dir="rtl" style="font-family:Arial,sans-serif">
            <h2 style="color:#DD9933">ENG Tours</h2>
            <p>שלום,</p>
            <p>מצורפים פרטי ההזמנה שלך לאירוע <b>${eventName}</b>.</p>
            <p><a href="${link}" style="display:inline-block;background:#DD9933;color:white;padding:10px 20px;text-decoration:none;border-radius:6px">📄 הורד PDF של פרטי ההזמנה</a></p>
            <p style="color:#6b7280;font-size:12px">או העתק את הקישור הבא: ${link}</p>
          </div>`,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        return NextResponse.json({ success: false, error: d?.message || "שגיאה בשליחת מייל" }, { status: 400 });
      }
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }

  await audit("email_sent", "order", id, { after: { recipient: email, template: "order_details", link } }, request);
  return NextResponse.json({ success: true });
}
