export const revalidate = 600;
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { audit } from "@/lib/audit";

// Helper function to get system setting
async function getSetting(key: string): Promise<boolean | string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) return null;
  
  try {
    return JSON.parse(data.value);
  } catch {
    return data.value;
  }
}

export async function GET() {
  const supabase = createServiceClient();

  // Auto-archive events whose end_date has passed (if enabled)
  const autoArchive = await getSetting("auto_archive_past_events");
  if (autoArchive) {
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("events")
      .update({ status: "archived" })
      .eq("status", "active")
      .lt("end_date", today);
  }

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

  const typeCode = body.type_code || "RF";
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  const eventId = `${typeCode}${randomDigits}`;

  // Get setting for auto-activation of events
  const autoActivate = await getSetting("auto_activate_on_creation");

  const { data, error } = await supabase
    .from("events")
    .insert({
      id: eventId,
      name: body.name,
      description: body.description || null,
      type_code: typeCode,
      services: body.services || [],
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      min_age: body.min_age ?? null,
      max_age: body.max_age ?? null,
      mode: body.mode || "registration",
      status: autoActivate ? "active" : "draft",
      waiting_list_enabled: body.waiting_list_enabled ?? false,
      destination_country: body.destination_country || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await audit("create", "event", data.id, { after: data }, request);

  return NextResponse.json(data, { status: 201 });
}
