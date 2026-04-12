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
    const { orderId, itemId, issue_description } = body;

    if (!orderId || !itemId || !issue_description) {
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

    // Update the item with issue
    const { error: itemError } = await supabase
      .from("order_items")
      .update({
        has_issue: true,
        issue_description,
        confirmation_number: null,
        confirmed_at: null,
      })
      .eq("id", itemId)
      .eq("order_id", orderId)
      .eq("supplier_id", session.user.id);

    if (itemError) {
      console.error("Error reporting issue:", itemError);
      return NextResponse.json(
        { error: "Failed to report issue" },
        { status: 500 }
      );
    }

    // Update order status to issue_reported
    await supabase
      .from("orders")
      .update({ status: "issue_reported" })
      .eq("id", orderId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Supplier issue error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
