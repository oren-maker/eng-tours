import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

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
      booked_rooms: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
