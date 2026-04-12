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
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing orderId" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify supplier owns this order
    const { data: order } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("supplier_id", session.user.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check all items have confirmation numbers and no issues
    const { data: items } = await supabase
      .from("order_items")
      .select("id, confirmation_number, has_issue")
      .eq("order_id", orderId)
      .eq("supplier_id", session.user.id);

    const allConfirmed = items?.every(
      (item) => item.confirmation_number && !item.has_issue
    );

    if (!allConfirmed) {
      return NextResponse.json(
        {
          error:
            "לא ניתן לאשר - יש פריטים ללא מספר אישור או עם בעיות פתוחות",
        },
        { status: 400 }
      );
    }

    // Update order status to confirmed
    const { error } = await supabase
      .from("orders")
      .update({
        status: "confirmed",
        supplier_approved_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Error approving order:", error);
      return NextResponse.json(
        { error: "Failed to approve order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Supplier approve error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
