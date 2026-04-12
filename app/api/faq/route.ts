import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET /api/faq - Public: active FAQs only; with ?all=true: all FAQs (admin)
export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const showAll = request.nextUrl.searchParams.get("all") === "true";

  let query = supabase
    .from("faq")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!showAll) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ faqs: data || [] });
}

// POST /api/faq - Admin: add new question
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const { question, answer, sort_order } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: "נדרש שאלה ותשובה" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("faq")
      .insert({
        question,
        answer,
        sort_order: sort_order || 0,
        is_active: true,
        helpful_yes: 0,
        helpful_no: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ faq: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "שגיאה ביצירת שאלה" }, { status: 500 });
  }
}
