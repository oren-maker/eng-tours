import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("*, events(name, event_id)")
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
    .from("tickets")
    .insert({
      event_id: body.event_id,
      name: body.name,
      ticket_type: body.ticket_type || null,
      description: body.description || null,
      price_usd: body.price_usd ?? null,
      total_quantity: body.total_quantity ?? null,
      sold_quantity: 0,
      venue: body.venue || null,
      event_date: body.event_date || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
