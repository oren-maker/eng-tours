export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { renderEmailTemplate } from "@/lib/email-templates";

const SAMPLE_VARS: Record<string, Record<string, any>> = {
  order_created: { event_name: "פסטיבל איי יוון", order_id: "A1B2C3D4", link: "https://eng-tours.vercel.app/p/abc-123" },
  order_details: { event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" },
  order_details_buyers: { first_name: "דן", event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" },
  payment_confirmed: { event_name: "פסטיבל איי יוון", amount: "5,000", order_id: "A1B2C3D4" },
  partial_payment: { event_name: "פסטיבל איי יוון", paid: "2,000", remaining: "3,000", order_id: "A1B2C3D4", link: "https://eng-tours.vercel.app/p/abc-123" },
  order_confirmed_customer: { event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" },
  event_reminder: { n: "7", event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/p/abc-123" },
  supplier_new_order: { order_id: "A1B2C3D4", event_name: "פסטיבל איי יוון", link: "https://eng-tours.vercel.app/supplier/order/abc" },
  "2fa_code": { code: "123456" },
};

export async function POST(request: Request) {
  const { to, template } = await request.json();
  if (!to || !template) return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return NextResponse.json({ error: "RESEND_API_KEY לא מוגדר" }, { status: 500 });

  const rendered = await renderEmailTemplate(template, SAMPLE_VARS[template] || {}, to);
  if (!rendered) return NextResponse.json({ error: "תבנית לא נמצאה או כבויה" }, { status: 404 });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "ENG TOURS <onboarding@resend.dev>",
        to: [to],
        subject: `[בדיקה] ${rendered.subject}`,
        html: rendered.html,
      }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.message || `Resend ${res.status}` }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
