export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const sb = createServiceClient();
  const { count } = await sb.from("rag_documents").select("id", { count: "exact", head: true });
  let perSource: any = null;
  try {
    const { data } = await sb.rpc("rag_source_counts");
    perSource = data;
  } catch {}
  const { data: recent } = await sb
    .from("rag_queries")
    .select("question, grade, retry_count, elapsed_ms, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return NextResponse.json({ total: count || 0, per_source: perSource, recent: recent || [] });
}
