"use client";

import { useEffect, useState } from "react";
import PackageForm from "../package-form";

export default function NewPackagePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/flights").then((r) => r.json()),
      fetch("/api/rooms").then((r) => r.json()),
      fetch("/api/tickets").then((r) => r.json()),
    ])
      .then(([eventsData, flightsData, roomsData, ticketsData]) => {
        if (Array.isArray(eventsData)) setEvents(eventsData);
        if (Array.isArray(flightsData)) setFlights(flightsData);
        if (Array.isArray(roomsData)) setRooms(roomsData);
        if (Array.isArray(ticketsData)) setTickets(ticketsData);
      })
      .catch(() => setError("שגיאה בטעינה"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">טוען...</div>;
  if (error) return <div className="text-center text-red-500 py-12">שגיאה: {error}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-900 mb-6">חבילה חדשה</h2>
      <PackageForm
        events={events}
        flights={flights}
        rooms={rooms as any}
        tickets={tickets}
      />
    </div>
  );
}
