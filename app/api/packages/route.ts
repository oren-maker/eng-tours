import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("packages")
    .select("*, events(name, event_id), flights(flight_code, airline), rooms(room_type, hotels(name)), tickets(name)")
    .order("created_at", { ascending: false });

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
      description: body.description || null,
      flight_id: body.flight_id || null,
      room_id: body.room_id || null,
      ticket_id: body.ticket_id || null,
      total_price: body.total_price ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
