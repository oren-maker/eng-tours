export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notify";

export async function POST(request: Request) {
  const body = await request.json();
  const { template, phone, email, vars, order_id, recipient_type, forceChannels } = body;
  if (!template) return NextResponse.json({ error: "חסר שם תבנית" }, { status: 400 });
  const result = await sendNotification(
    template,
    { phone, email },
    vars || {},
    { order_id, recipient_type, forceChannels }
  );
  return NextResponse.json(result);
}
