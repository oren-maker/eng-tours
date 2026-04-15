export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { renderEmailTemplate } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";

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

  const rendered = await renderEmailTemplate(template, SAMPLE_VARS[template] || {}, to);
  if (!rendered) return NextResponse.json({ error: "תבנית לא נמצאה או כבויה" }, { status: 404 });

  const result = await sendEmail(to, `[בדיקה] ${rendered.subject}`, rendered.html, {
    template,
    recipient_type: "test",
    variables: SAMPLE_VARS[template] as any,
    prerendered: true,
  });

  if (!result.success) return NextResponse.json({ error: result.error || "שליחה נכשלה" }, { status: 500 });
  return NextResponse.json({ ok: true, id: result.id });
}
