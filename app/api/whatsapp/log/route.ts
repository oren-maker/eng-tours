export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const direction = searchParams.get("direction");
    const status = searchParams.get("status");
    const recipientType = searchParams.get("recipient_type");
    const orderId = searchParams.get("order_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();
    let query = supabase
      .from("whatsapp_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (direction) query = query.eq("direction", direction);
    if (status) query = query.eq("status", status);
    if (recipientType) query = query.eq("recipient_type", recipientType);
    if (orderId) query = query.eq("order_id", orderId);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching WhatsApp log:", error);
      return NextResponse.json(
        { error: "Failed to fetch log" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      messages: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("WhatsApp log error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
