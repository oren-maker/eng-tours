export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  // Pull this page's affiliate ids first so we can also catch leads whose
  // `page_id` got out of sync but still point at one of the affiliates here
  // (e.g., when a page was duplicated/reslugged and old leads remain).
  const { data: affs } = await supabase
    .from("marketing_affiliates")
    .select("id")
    .eq("page_id", params.id);
  const affIds = (affs || []).map((a: { id: string }) => a.id);

  const orFilter = affIds.length
    ? `page_id.eq.${params.id},affiliate_id.in.(${affIds.join(",")})`
    : `page_id.eq.${params.id}`;

  const { data, error } = await supabase
    .from("marketing_leads")
    .select("*")
    .or(orFilter)
    .order("created_at", { ascending: false } as never);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data || [] });
}
