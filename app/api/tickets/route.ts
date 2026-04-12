import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("*, events(name)")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();

  // Derive payment_type from event.mode if not provided correctly
  let paymentType = body.payment_type;
  if (!["credit", "installments", "bank", "free"].includes(paymentType)) {
    // Look up event mode
    if (body.event_id) {
      const { data: ev } = await supabase.from("events").select("mode").eq("id", body.event_id).single();
      paymentType = ev?.mode === "payment" ? "credit" : "free";
    } else {
      paymentType = "free";
    }
  }

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      event_id: body.event_id,
      name: body.name,
      price_customer: body.price_customer ?? null,
      price_company: body.price_company ?? null,
      external_url: body.external_url || null,
      payment_type: paymentType,
      total_qty: body.total_qty ?? null,
      booked_qty: 0,
      currency: body.currency || "ILS",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit("create", "ticket", data?.id, { after: data }, request);
  return NextResponse.json(data, { status: 201 });
}
