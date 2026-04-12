export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase";
import TicketForm from "../ticket-form";

export default async function NewTicketPage() {
  const supabase = createServiceClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, name, event_id")
    .eq("status", "active")
    .order("name");

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">כרטיס חדש</h2>
      <TicketForm events={events || []} />
    </div>
  );
}
