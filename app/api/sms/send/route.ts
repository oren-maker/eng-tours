export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { sendSms } from "@/lib/pulseem";

export async function POST(request: Request) {
  const { to, text, order_id, sender, recipient_type } = await request.json();
  if (!to || !text) return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
  const result = await sendSms(to, text, { order_id, sender, recipient_type });
  if (!result.success) {
    return NextResponse.json(
      { error: result.error, pendingSenderApproval: result.pendingSenderApproval, raw: result.raw },
      { status: result.pendingSenderApproval ? 202 : 500 }
    );
  }
  return NextResponse.json({ ok: true, campaignId: result.campaignId });
}
