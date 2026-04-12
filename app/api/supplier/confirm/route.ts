export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "supplier") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, itemId, confirmation_number, notes } = body;

    if (!orderId || !itemId || !confirmation_number) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify supplier owns this order
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .eq("supplier_id", session.user.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update the item
    const { error } = await supabase
      .from("order_items")
      .update({
        confirmation_number,
        notes: notes || null,
        has_issue: false,
        issue_description: null,
        confirmed_at: new Date().toISOString(),
        confirmed_by: session.user.id,
      })
      .eq("id", itemId)
      .eq("order_id", orderId)
      .eq("supplier_id", session.user.id);

    if (error) {
      console.error("Error confirming item:", error);
      return NextResponse.json(
        { error: "Failed to confirm item" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Supplier confirm error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
