export const revalidate = 600;
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

export async function PATCH(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { id, ...update } = body;
  const { data: before } = await supabase.from("tickets").select("*").eq("id", id).single();

  // Validation: cannot reduce total_qty below booked_qty
  if (update.total_qty !== undefined && before) {
    const booked = Number(before.booked_qty) || 0;
    const newTotal = Number(update.total_qty);
    if (newTotal < booked) {
      return NextResponse.json(
        { error: `לא ניתן להוריד את המלאי ל-${newTotal}. כבר נרכשו ${booked} כרטיסים. המלאי המינימלי האפשרי הוא ${booked}.` },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase.from("tickets").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit("update", "ticket", id, { before, after: data }, request);
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { data: before } = await supabase.from("tickets").select("*").eq("id", id).single();
  if (before?.booked_qty && Number(before.booked_qty) > 0) {
    return NextResponse.json({ error: `לא ניתן למחוק — כבר נרכשו ${before.booked_qty} כרטיסים` }, { status: 400 });
  }
  const { error } = await supabase.from("tickets").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit("delete", "ticket", id, { before }, request);
  return NextResponse.json({ success: true });
}
