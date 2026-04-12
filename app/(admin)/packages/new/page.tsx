export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase";
import PackageForm from "../package-form";

export default async function NewPackagePage() {
  const supabase = createServiceClient();

  const { data: events } = await supabase
    .from("events")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  const { data: flights } = await supabase
    .from("flights")
    .select("id, flight_code, airline_name, event_id, origin_city, dest_city")
    .order("departure_time");

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, room_type, event_id, hotel_id, hotels(name)")
    .order("check_in");

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, name, event_id")
    .order("name");

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">חבילה חדשה</h2>
      <PackageForm
        events={events || []}
        flights={flights || []}
        rooms={(rooms || []) as any}
        tickets={tickets || []}
      />
    </div>
  );
}
