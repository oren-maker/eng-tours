export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ingestAll } from "@/lib/rag/ingest";
import { logAction } from "@/lib/audit";
import { logError } from "@/lib/log-error";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const started = Date.now();
    const summary = await ingestAll();
    const elapsed = Date.now() - started;
    await logAction(session.user.id, "rag_ingest", "rag", undefined, undefined, { ...summary, elapsed_ms: elapsed });
    return NextResponse.json({ ok: true, ...summary, elapsed_ms: elapsed });
  } catch (err: any) {
    await logError("rag/ingest", err);
    return NextResponse.json({ error: err.message || "Ingest failed" }, { status: 500 });
  }
}
