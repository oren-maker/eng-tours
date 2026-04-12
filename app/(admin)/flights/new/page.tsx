"use client";

import { useEffect, useState } from "react";
import FlightForm from "../flight-form";

export default function NewFlightPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
        else setError(data.error || "שגיאה בטעינה");
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (error) return <div className="text-center text-red-500 py-12">שגיאה: {error}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">טיסה חדשה</h2>
      <FlightForm events={events} />
    </div>
  );
}
