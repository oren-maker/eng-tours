import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id");

  let query = supabase
    .from("flights")
    .select("*, events(name, event_id)")
    .order("departure_date", { ascending: true });

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("flights")
    .insert({
      event_id: body.event_id,
      airline: body.airline,
      flight_code: body.flight_code,
      departure_date: body.departure_date || null,
      departure_time: body.departure_time || null,
      arrival_date: body.arrival_date || null,
      arrival_time: body.arrival_time || null,
      origin_city: body.origin_city || null,
      origin_iata: body.origin_iata || null,
      dest_city: body.dest_city || null,
      dest_iata: body.dest_iata || null,
      total_seats: body.total_seats ?? null,
      booked_seats: 0,
      price_usd: body.price_usd ?? null,
      transfer_company: body.transfer_company || null,
      contact_info: body.contact_info || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
