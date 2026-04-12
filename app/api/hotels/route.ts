import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hotels")
    .select("*")
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
    .from("hotels")
    .insert({
      name: body.name,
      city: body.city || null,
      country: body.country || null,
      stars: body.stars ?? body.star_rating ?? null,
      contact_name: body.contact_name || null,
      contact_phone: body.contact_phone || body.phone || null,
      contact_email: body.contact_email || body.email || null,
      website: body.website || null,
      rating: body.rating ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit("create", "hotel", data?.id, { after: data }, request);
  return NextResponse.json(data, { status: 201 });
}
