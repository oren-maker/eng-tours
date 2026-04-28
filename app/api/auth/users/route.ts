export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET /api/auth/users - List all users (admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, display_name, role, is_active, is_primary_admin, phone, marketing_page_id, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with page title for page_admin users
  const pageIds = (data || []).map((u) => u.marketing_page_id).filter(Boolean) as string[];
  let pageMap: Record<string, string> = {};
  if (pageIds.length) {
    const { data: pages } = await supabase
      .from("marketing_pages")
      .select("id, title")
      .in("id", pageIds);
    pageMap = (pages || []).reduce<Record<string, string>>((acc, p) => {
      acc[p.id] = p.title;
      return acc;
    }, {});
  }
  const enriched = (data || []).map((u) => ({ ...u, marketing_page_title: u.marketing_page_id ? pageMap[u.marketing_page_id] || null : null }));

  return NextResponse.json({ users: enriched });
}
