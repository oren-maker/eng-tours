export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

function genCode(len = 7): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  const { data: affiliates, error } = await supabase
    .from("marketing_affiliates")
    .select("*")
    .eq("page_id", params.id)
    .order("created_at", { ascending: false } as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (affiliates || []).map((a) => a.id);
  let leadCounts: Record<string, number> = {};
  if (ids.length) {
    const { data: leads } = await supabase
      .from("marketing_leads")
      .select("affiliate_id")
      .in("affiliate_id", ids);
    leadCounts = (leads || []).reduce<Record<string, number>>((acc, l: any) => {
      if (l.affiliate_id) acc[l.affiliate_id] = (acc[l.affiliate_id] || 0) + 1;
      return acc;
    }, {});
  }

  const enriched = (affiliates || []).map((a) => ({
    ...a,
    leads_count: leadCounts[a.id] || 0,
  }));
  return NextResponse.json({ affiliates: enriched });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim() || null;
  const email = String(body.email || "").trim() || null;
  if (!name) return NextResponse.json({ error: "שם חובה" }, { status: 400 });

  let tracking_code = "";
  for (let i = 0; i < 5; i++) {
    const candidate = genCode();
    const { data: clash } = await supabase
      .from("marketing_affiliates")
      .select("id")
      .eq("tracking_code", candidate)
      .maybeSingle();
    if (!clash) { tracking_code = candidate; break; }
  }
  if (!tracking_code) return NextResponse.json({ error: "לא הצלחנו ליצור קוד" }, { status: 500 });

  const { data, error } = await supabase
    .from("marketing_affiliates")
    .insert({ page_id: params.id, name, phone, email, tracking_code })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ affiliate: { ...data, leads_count: 0 } }, { status: 201 });
}
