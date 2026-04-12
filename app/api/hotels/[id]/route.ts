import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hotels")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Also fetch rooms for this hotel
  const { data: rooms } = await supabase
    .from("rooms")
    .select("*, events(name)")
    .eq("hotel_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ ...data, rooms: rooms || [] });
}
