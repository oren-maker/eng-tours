import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Get current status
  const { data: event, error: fetchError } = await supabase
    .from("events")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError || !event) {
    return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });
  }

  const newStatus = event.status === "active" ? "archived" : "active";

  const { data, error } = await supabase
    .from("events")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
