import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const body = await request.json();

  const { data: before } = await supabase.from("events").select("*").eq("id", id).single();

  const { data, error } = await supabase
    .from("events")
    .update({
      name: body.name,
      description: body.description || null,
      type_code: body.type_code,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      min_age: body.min_age ?? null,
      max_age: body.max_age ?? null,
      mode: body.mode,
      waiting_list_enabled: body.waiting_list_enabled ?? false,
      services: body.services,
      destination_country: body.destination_country || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await audit("update", "event", id, { before, after: data }, request);

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: before } = await supabase.from("events").select("*").eq("id", id).single();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit("delete", "event", id, { before }, request);
  return NextResponse.json({ success: true });
}
