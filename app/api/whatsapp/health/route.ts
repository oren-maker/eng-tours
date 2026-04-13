export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { wasender, isConfigured } from "@/lib/wasender";

export async function GET() {
  try {
    if (!isConfigured()) {
      return NextResponse.json({ online: false, error: "Not configured" });
    }
    const r = await wasender.listSessions();
    if (!r.ok) return NextResponse.json({ online: false, error: r.error });
    const data: any = r.data;
    const sessions = Array.isArray(data) ? data : (data?.data || []);
    const connected = sessions.some((s: any) => {
      const st = (s.status || "").toLowerCase();
      return st === "connected" || st === "ready";
    });
    return NextResponse.json({ online: connected, sessions: sessions.length });
  } catch (err: any) {
    return NextResponse.json({ online: false, error: err.message || "Internal error" });
  }
}
