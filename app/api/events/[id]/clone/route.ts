import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: original, error: fetchError } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });
  }

  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  const event_id = `${original.type_code}${randomDigits}`;

  const { data, error } = await supabase
    .from("events")
    .insert({
      event_id,
      name: `${original.name} (עותק)`,
      description: original.description,
      type_code: original.type_code,
      start_date: original.start_date,
      end_date: original.end_date,
      min_age: original.min_age,
      max_age: original.max_age,
      state: original.state,
      waitlist_enabled: original.waitlist_enabled,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
