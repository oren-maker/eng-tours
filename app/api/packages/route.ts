export const revalidate = 600;
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("packages")
    .select("*, events(name), flights(flight_code, airline_name), rooms(room_type, hotels(name)), tickets(name)")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("packages")
    .insert({
      event_id: body.event_id,
      name: body.name,
      service_level: body.service_level || null,
      flight_id: body.flight_id || null,
      room_id: body.room_id || null,
      ticket_id: body.ticket_id || null,
      price_total: body.price_total ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
