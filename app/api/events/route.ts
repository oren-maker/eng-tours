import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();

  // Auto-generate event ID: type_code + 5 random digits
  const typeCode = body.type_code || "RF";
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  const eventId = `${typeCode}${randomDigits}`;

  const { data, error } = await supabase
    .from("events")
    .insert({
      id: eventId,
      name: body.name,
      description: body.description || null,
      type_code: typeCode,
      services: body.services || [],
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      min_age: body.min_age ?? null,
      max_age: body.max_age ?? null,
      mode: body.mode || "registration",
      status: "active",
      waiting_list_enabled: body.waiting_list_enabled ?? false,
      destination_country: body.destination_country || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
