export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("flights")
    .select("*, events(name)")
    .eq("airline_id", id)
    .order("departure_time");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const body = await req.json();

  const { data: airline } = await supabase.from("airlines").select("name").eq("id", id).single();

  const { data, error } = await supabase
    .from("flights")
    .insert({
      airline_id: id,
      airline_name: airline?.name || body.airline_name,
      event_id: body.event_id || null,
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
      currency: body.currency || "ILS",
      transfer_company: body.transfer_company || null,
      contact_phone: body.contact_phone || null,
      contact_name: body.contact_name || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit("create", "flight", data?.id, { after: data }, req);
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  const supabase = createServiceClient();
  const body = await req.json();
  if (!body.flight_id) return NextResponse.json({ error: "flight_id required" }, { status: 400 });

  const { flight_id, ...update } = body;
  const { data: before } = await supabase.from("flights").select("*").eq("id", flight_id).single();
  const { data, error } = await supabase.from("flights").update(update).eq("id", flight_id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit("update", "flight", flight_id, { before, after: data }, req);
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const supabase = createServiceClient();
  const body = await req.json();
  if (!body.flight_id) return NextResponse.json({ error: "flight_id required" }, { status: 400 });
  const { data: before } = await supabase.from("flights").select("*").eq("id", body.flight_id).single();
  const { error } = await supabase.from("flights").delete().eq("id", body.flight_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit("delete", "flight", body.flight_id, { before }, req);
  return NextResponse.json({ success: true });
}
