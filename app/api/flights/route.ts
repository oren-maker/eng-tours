export const revalidate = 600;
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function GET(request: Request) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id");

  let query = supabase
    .from("flights")
    .select("*, events(name)")
    .order("departure_time", { ascending: true });

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
      airline_name: body.airline_name || body.airline,
      flight_code: body.flight_code,
      departure_time: body.departure_time || null,
      arrival_time: body.arrival_time || null,
      origin_city: body.origin_city || null,
      origin_iata: body.origin_iata || null,
      dest_city: body.dest_city || null,
      dest_iata: body.dest_iata || null,
      total_seats: body.total_seats ?? null,
      booked_seats: 0,
      price_company: body.price_company ?? null,
      price_customer: body.price_customer ?? null,
      transfer_company: body.transfer_company || null,
      contact_phone: body.contact_phone || null,
      contact_name: body.contact_name || null,
      currency: body.currency || "ILS",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
