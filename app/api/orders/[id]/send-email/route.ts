export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { email } = body;
  if (!email) return NextResponse.json({ error: "חסר מייל" }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://eng-tours.vercel.app";
  const supabase = createServiceClient();
  const { data: order } = await supabase.from("orders").select("id, share_token, events(name)").eq("id", id).single();
  const link = `${base}/p/${(order as any)?.share_token || id}`;
  const eventName = (order as any)?.events?.name || "אירוע";

  // Try Resend if configured
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (RESEND_KEY) {
    try {
      const { renderEmailTemplate, isUnsubscribed } = await import("@/lib/email-templates");
      if (await isUnsubscribed(email)) {
        return NextResponse.json({ success: false, error: "הנמען ביקש להסיר עצמו מרשימת התפוצה", skipped: true }, { status: 400 });
      }
      const tpl = await renderEmailTemplate("order_details", { event_name: eventName, link }, email);
      if (!tpl) return NextResponse.json({ success: false, error: "התבנית order_details כבויה או חסרה" }, { status: 400 });
      const result = await sendEmail(email, tpl.subject, tpl.html, {
        template: "order_details",
        recipient_type: "customer",
        order_id: id,
        prerendered: true,
      });
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || "שגיאה בשליחת מייל" }, { status: 400 });
      }
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }

  await audit("email_sent", "order", id, { after: { recipient: email, template: "order_details", link } }, request);
  return NextResponse.json({ success: true });
}
