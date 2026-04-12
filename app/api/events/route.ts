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

  // Auto-generate event_id: type_code + 5 random digits
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  const event_id = `${body.type_code}${randomDigits}`;

  const { data, error } = await supabase
    .from("events")
    .insert({
      event_id,
      name: body.name,
      description: body.description || null,
      type_code: body.type_code,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      min_age: body.min_age ?? null,
      max_age: body.max_age ?? null,
      state: body.state || "registration",
      waitlist_enabled: body.waitlist_enabled ?? false,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
