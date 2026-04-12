export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "supplier") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    // If orderId is provided, return single order with items
    if (orderId) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          status,
          created_at,
          participant_count,
          events (
            name,
            start_date
          )
        `
        )
        .eq("id", orderId)
        .eq("supplier_id", session.user.id)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }

      // Get order items assigned to this supplier
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)
        .eq("supplier_id", session.user.id)
        .order("type", { ascending: true });

      if (itemsError) {
        return NextResponse.json(
          { error: "Failed to fetch items" },
          { status: 500 }
        );
      }

      const event = order.events as any;
      return NextResponse.json({
        order: {
          id: order.id,
          order_number: order.order_number,
          event_name: event?.name || "אירוע",
          event_date: event?.start_date || null,
          participant_count: order.participant_count || 0,
          status: order.status,
          items: items || [],
        },
      });
    }

    // Otherwise return list of orders for this supplier
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        status,
        created_at,
        participant_count,
        events (
          name,
          start_date
        )
      `
      )
      .eq("supplier_id", session.user.id)
      .in("status", ["supplier_review", "issue_reported", "confirmed"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching supplier orders:", error);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    const formatted = (orders || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      event_name: o.events?.name || "אירוע",
      event_date: o.events?.start_date || null,
      participant_count: o.participant_count || 0,
      status: o.status,
      created_at: o.created_at,
    }));

    return NextResponse.json({ orders: formatted });
  } catch (err) {
    console.error("Supplier orders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
