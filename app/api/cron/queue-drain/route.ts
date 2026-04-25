export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { drainOneDueAdminAlert } from "@/lib/admin-notify";
import { processQueue } from "@/lib/outbound-queue";

const SECRET = process.env.CRON_SECRET || "";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const expected = `Bearer ${SECRET}`;
  if (!SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Drain up to 6 admin lead alerts spaced by their scheduled_for spacing
  // (we set 10s gaps at enqueue time).
  const sent: number[] = [];
  for (let i = 0; i < 6; i++) {
    const r = await drainOneDueAdminAlert();
    if (!r.sent) break;
    sent.push(1);
  }

  // Also drain other pending non-admin queue items (best-effort).
  const other = await processQueue(10);

  return NextResponse.json({ admin_alerts_sent: sent.length, other });
}
