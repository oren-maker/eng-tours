export const dynamic = "force-dynamic";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") || "";
  const recipient = searchParams.get("to") || "preview@eng-tours.com";
  if (!name) return new Response("חסר שם תבנית", { status: 400 });

  const tpl = await renderEmailTemplate(name, SAMPLE_VARS[name] || {}, recipient);
  if (!tpl) return new Response("תבנית לא נמצאה או כבויה", { status: 404 });

  return new Response(tpl.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
