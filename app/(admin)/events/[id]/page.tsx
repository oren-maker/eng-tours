"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EventForm from "../event-form";

export default function EditEventPage() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("לא נמצא");
        return res.json();
      })
      .then((data) => {
        if (data.error) setError(data.error);
        else setEvent(data);
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (error) return <div className="text-center text-red-500 py-12">שגיאה: {error}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">עריכת אירוע</h2>
      <EventForm event={event} />
    </div>
  );
}
