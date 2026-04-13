export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { wasender } from "@/lib/wasender";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await wasender.disconnectSession(id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status || 500 });
  return NextResponse.json({ success: true });
}
