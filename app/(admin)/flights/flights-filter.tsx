"use client";

import { useRouter } from "next/navigation";

interface FlightsFilterProps {
  events: { id: string; name: string }[];
  selectedEventId?: string;
}

export default function FlightsFilter({ events, selectedEventId }: FlightsFilterProps) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val) {
      router.push(`/flights?event_id=${val}`);
    } else {
      router.push("/flights");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700">סינון לפי אירוע:</label>
      <select
        value={selectedEventId || ""}
        onChange={handleChange}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none min-w-[200px]"
      >
        <option value="">כל האירועים</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name} ({ev.id})
          </option>
        ))}
      </select>
    </div>
  );
}
