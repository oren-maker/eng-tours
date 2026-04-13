export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { wasender, isConfigured } from "@/lib/wasender";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) return NextResponse.json({ error: "WaSender API key not configured" }, { status: 500 });
  const { id } = await params;
  const r = await wasender.getSession(id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json({ session: r.data });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) return NextResponse.json({ error: "WaSender API key not configured" }, { status: 500 });
  const { id } = await params;
  const body = await req.json();
  const r = await wasender.updateSession(id, body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json({ session: r.data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) return NextResponse.json({ error: "WaSender API key not configured" }, { status: 500 });
  const { id } = await params;
  const r = await wasender.deleteSession(id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json({ success: true });
}
