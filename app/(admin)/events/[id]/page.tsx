import { createServiceClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import EventForm from "../event-form";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !event) {
    notFound();
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">עריכת אירוע</h2>
      <EventForm event={event} />
    </div>
  );
}
