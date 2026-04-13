export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { wasender, isConfigured } from "@/lib/wasender";

export async function GET() {
  if (!isConfigured()) return NextResponse.json({ error: "WaSender API key not configured" }, { status: 500 });
  const r = await wasender.listSessions();
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  const data: any = r.data;
  const sessions = Array.isArray(data) ? data : (data?.data || []);
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  if (!isConfigured()) return NextResponse.json({ error: "WaSender API key not configured" }, { status: 500 });
  const body = await request.json();
  if (!body.name || !body.phone_number) {
    return NextResponse.json({ error: "name and phone_number are required" }, { status: 400 });
  }
  const r = await wasender.createSession({
    name: body.name,
    phone_number: body.phone_number,
    account_protection: body.account_protection ?? true,
    log_messages: body.log_messages ?? true,
    webhook_url: body.webhook_url,
    webhook_enabled: body.webhook_enabled ?? false,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json({ session: r.data });
}
