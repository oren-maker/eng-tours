export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET /api/orders - List orders with optional filters
export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);

  const eventId = searchParams.get("event_id");
  const status = searchParams.get("status");

  let query = supabase
    .from("orders")
    .select("*, events(name, end_date, start_date), participants(first_name_en, last_name_en, phone, passport_number)")
    .order("created_at", { ascending: false });

  if (eventId) {
    query = query.eq("event_id", eventId);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return as array directly for frontend compatibility
  return NextResponse.json(data || []);
}

// POST /api/orders - Create order from public booking form
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  try {
    const body = await request.json();
    const {
      event_id,
      mode,
      participants,
      coupon_code,
    } = body;

    if (!event_id || !participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "נדרש אירוע ומשתתפים" },
        { status: 400 }
      );
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "אירוע לא נמצא" },
        { status: 404 }
      );
    }

    // Calculate total price from participant selections
    let totalPrice = 0;
    const participantPrices: number[] = [];

    for (const p of participants) {
      let price = 0;

      if (p.package_id) {
        const { data: pkg } = await supabase
          .from("packages")
          .select("price_total")
          .eq("id", p.package_id)
          .single();
        if (pkg) price = Number(pkg.price_total);
      } else {
        if (p.flight_id) {
          const { data: flight } = await supabase
            .from("flights")
            .select("price_customer")
            .eq("id", p.flight_id)
            .single();
          if (flight) price += Number(flight.price_customer);
        }
        if (p.room_id) {
          const { data: room } = await supabase
            .from("rooms")
            .select("price_customer")
            .eq("id", p.room_id)
            .single();
          if (room) price += Number(room.price_customer);
        }
        if (p.ticket_id) {
          const { data: ticket } = await supabase
            .from("tickets")
            .select("price_customer")
            .eq("id", p.ticket_id)
            .single();
          if (ticket) price += Number(ticket.price_customer);
        }
      }

      participantPrices.push(price);
      totalPrice += price;
    }

    // Apply coupon if provided
    let discount = 0;
    if (coupon_code) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (coupon) {
        const isEventMatch = !coupon.event_id || coupon.event_id === event_id;
        const isNotExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const isNotMaxed = !coupon.max_uses || coupon.used_count < coupon.max_uses;

        if (isEventMatch && isNotExpired && isNotMaxed) {
          if (coupon.discount_type === "percent") {
            discount = totalPrice * (Number(coupon.discount_value) / 100);
          } else {
            discount = Number(coupon.discount_value);
          }
          // Increment used_count
          await supabase
            .from("coupons")
            .update({ used_count: coupon.used_count + 1 })
            .eq("id", coupon.id);
        }
      }
    }

    totalPrice = Math.max(0, totalPrice - discount);

    // Stock check - verify availability before creating order
    for (const p of participants) {
      if (p.flight_id) {
        const { data: flight } = await supabase
          .from("flights")
          .select("total_seats, booked_seats")
          .eq("id", p.flight_id)
          .single();
        if (flight && flight.booked_seats >= flight.total_seats) {
          return NextResponse.json(
            { error: "אין מקומות פנויים בטיסה שנבחרה" },
            { status: 409 }
          );
        }
      }
      if (p.room_id) {
        const { data: room } = await supabase
          .from("rooms")
          .select("total_rooms, booked_rooms")
          .eq("id", p.room_id)
          .single();
        if (room && room.booked_rooms >= room.total_rooms) {
          return NextResponse.json(
            { error: "אין חדרים פנויים" },
            { status: 409 }
          );
        }
      }
      if (p.ticket_id) {
        const { data: ticket } = await supabase
          .from("tickets")
          .select("total_qty, booked_qty")
          .eq("id", p.ticket_id)
          .single();
        if (ticket && ticket.booked_qty >= ticket.total_qty) {
          return NextResponse.json(
            { error: "אין כרטיסים זמינים" },
            { status: 409 }
          );
        }
      }
    }

    // Create order
    const orderStatus = mode === "registration" ? "completed" : "pending_payment";
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        event_id,
        status: orderStatus,
        mode: mode || event.mode,
        total_price: totalPrice,
        amount_paid: 0,
      })
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "שגיאה ביצירת הזמנה" },
        { status: 500 }
      );
    }

    // Create participants
    const participantRecords = participants.map((p: Record<string, unknown>) => ({
      order_id: order.id,
      first_name_en: p.first_name_en,
      last_name_en: p.last_name_en,
      passport_number: p.passport_number,
      passport_expiry: p.passport_expiry,
      birth_date: p.birth_date,
      age_at_event: p.age_at_event,
      phone: p.phone,
      email: p.email,
      passport_image_url: p.passport_image_url,
      flight_id: p.flight_id || null,
      room_id: p.room_id || null,
      ticket_id: p.ticket_id || null,
      package_id: p.package_id || null,
      amount_paid: 0,
    }));

    const { error: participantsError } = await supabase
      .from("participants")
      .insert(participantRecords);

    if (participantsError) {
      console.error("Failed to create participants:", participantsError);
    }

    // Update stock counts
    for (const p of participants) {
      if (p.flight_id) {
        const { data: flightData } = await supabase
          .from("flights")
          .select("booked_seats")
          .eq("id", p.flight_id)
          .single();
        if (flightData) {
          await supabase
            .from("flights")
            .update({ booked_seats: (flightData.booked_seats || 0) + 1 })
            .eq("id", p.flight_id);
        }
      }
      if (p.room_id) {
        supabase
          .from("rooms")
          .select("booked_rooms")
          .eq("id", p.room_id)
          .single()
          .then(({ data }) => {
            if (data) {
              supabase
                .from("rooms")
                .update({ booked_rooms: data.booked_rooms + 1 })
                .eq("id", p.room_id);
            }
          });
      }
      if (p.ticket_id) {
        supabase
          .from("tickets")
          .select("booked_qty")
          .eq("id", p.ticket_id)
          .single()
          .then(({ data }) => {
            if (data) {
              supabase
                .from("tickets")
                .update({ booked_qty: data.booked_qty + 1 })
                .eq("id", p.ticket_id);
            }
          });
      }
    }

    // Audit log
    await supabase.from("audit_log").insert({
      action: "order_created",
      entity_type: "order",
      entity_id: order.id,
      after_data: { status: orderStatus, total_price: totalPrice, event_id },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json(
      { error: "שגיאה ביצירת הזמנה" },
      { status: 500 }
    );
  }
}
