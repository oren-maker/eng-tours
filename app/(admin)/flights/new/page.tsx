export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase";
import FlightForm from "../flight-form";

export default async function NewFlightPage() {
  const supabase = createServiceClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">טיסה חדשה</h2>
      <FlightForm events={events || []} />
    </div>
  );
}
