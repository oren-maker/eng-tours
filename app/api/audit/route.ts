import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET /api/audit - Get audit logs with filters + pagination
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "25"));
  const userId = searchParams.get("user_id");
  const entityType = searchParams.get("entity_type");
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("audit_log")
    .select("*, users!audit_log_user_id_fkey(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (userId) {
    query = query.eq("user_id", userId);
  }
  if (entityType) {
    query = query.eq("entity_type", entityType);
  }
  if (dateFrom) {
    query = query.gte("created_at", `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    query = query.lte("created_at", `${dateTo}T23:59:59`);
  }

  const { data, error, count } = await query;

  if (error) {
    // Fallback: try without the join if the FK doesn't exist
    let fallbackQuery = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (userId) fallbackQuery = fallbackQuery.eq("user_id", userId);
    if (entityType) fallbackQuery = fallbackQuery.eq("entity_type", entityType);
    if (dateFrom) fallbackQuery = fallbackQuery.gte("created_at", `${dateFrom}T00:00:00`);
    if (dateTo) fallbackQuery = fallbackQuery.lte("created_at", `${dateTo}T23:59:59`);

    const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery;

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }

    const entries = (fallbackData || []).map((row) => ({
      ...row,
      user_name: null,
    }));

    return NextResponse.json({
      entries,
      total: fallbackCount || 0,
      page,
      limit,
      totalPages: Math.ceil((fallbackCount || 0) / limit),
    });
  }

  const entries = (data || []).map((row) => ({
    ...row,
    user_name: (row.users as { display_name: string } | null)?.display_name || null,
    users: undefined,
  }));

  return NextResponse.json({
    entries,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
