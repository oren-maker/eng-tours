import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("*, events(name)")
    .eq("hotel_id", id)
    .order("check_in");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      hotel_id: id,
      event_id: body.event_id || null,
      room_type: body.room_type,
      check_in: body.check_in || null,
      check_out: body.check_out || null,
      price_company: body.price_company ?? null,
      price_customer: body.price_customer ?? null,
      capacity: body.capacity ?? null,
      total_rooms: body.total_rooms ?? null,
      currency: body.currency || "ILS",
      booked_rooms: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit("create", "room", data?.id, { after: data }, request);
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const supabase = createServiceClient();
  const body = await request.json();

  if (!body.room_id) {
    return NextResponse.json({ error: "room_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rooms")
    .update({
      event_id: body.event_id || null,
      room_type: body.room_type,
      check_in: body.check_in || null,
      check_out: body.check_out || null,
      price_company: body.price_company ?? null,
      price_customer: body.price_customer ?? null,
      capacity: body.capacity ?? null,
      total_rooms: body.total_rooms ?? null,
      currency: body.currency || "ILS",
    })
    .eq("id", body.room_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await params;
  const supabase = createServiceClient();
  const body = await request.json();
  const roomId = body.room_id;

  if (!roomId) {
    return NextResponse.json({ error: "room_id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", roomId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
