import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const hotelId = searchParams.get("hotel_id");

  let query = supabase
    .from("rooms")
    .select("*, events(name), hotels(name)")
    .order("check_in");

  if (hotelId) {
    query = query.eq("hotel_id", hotelId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
