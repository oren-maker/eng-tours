export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`track:${ip}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").trim();
  if (!code) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createServiceClient();
  const { data: aff } = await supabase
    .from("marketing_affiliates")
    .select("id, clicks")
    .eq("tracking_code", code)
    .maybeSingle();
  if (!aff) return NextResponse.json({ ok: false, reason: "unknown_code" }, { status: 404 });

  await supabase
    .from("marketing_affiliates")
    .update({ clicks: (aff.clicks || 0) + 1 })
    .eq("id", aff.id);

  return NextResponse.json({ ok: true });
}
