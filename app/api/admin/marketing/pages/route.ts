export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET() {
  const supabase = createServiceClient();
  const { data: pages, error } = await supabase
    .from("marketing_pages")
    .select("*")
    .order("created_at", { ascending: false } as never);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (pages || []).map((p) => p.id);
  let counts: Record<string, number> = {};
  let affCounts: Record<string, number> = {};
  if (ids.length) {
    const { data: leads } = await supabase
      .from("marketing_leads")
      .select("page_id")
      .in("page_id", ids);
    counts = (leads || []).reduce<Record<string, number>>((acc, l: any) => {
      acc[l.page_id] = (acc[l.page_id] || 0) + 1;
      return acc;
    }, {});
    const { data: affs } = await supabase
      .from("marketing_affiliates")
      .select("page_id")
      .in("page_id", ids);
    affCounts = (affs || []).reduce<Record<string, number>>((acc, a: any) => {
      acc[a.page_id] = (acc[a.page_id] || 0) + 1;
      return acc;
    }, {});
  }

  const enriched = (pages || []).map((p) => ({
    ...p,
    leads_count: counts[p.id] || 0,
    affiliates_count: affCounts[p.id] || 0,
  }));
  return NextResponse.json({ pages: enriched });
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  let slug = String(body.slug || "").trim() || slugify(title);
  const html = String(body.html || "");

  if (!title) return NextResponse.json({ error: "נדרשת כותרת" }, { status: 400 });
  if (!slug) slug = "page-" + Date.now().toString(36);

  const { data: existing } = await supabase
    .from("marketing_pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const { data, error } = await supabase
    .from("marketing_pages")
    .insert({ title, slug, html, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data }, { status: 201 });
}
