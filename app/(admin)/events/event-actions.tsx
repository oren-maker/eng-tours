"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface EventActionsProps {
  eventId: string;
  status: string;
}

export default function EventActions({ eventId, status }: EventActionsProps) {
  const router = useRouter();

  async function handleArchive() {
    if (!confirm(status === "active" ? "להעביר לארכיון?" : "לשחזר מארכיון?")) return;
    await fetch(`/api/events/${eventId}/archive`, { method: "POST" });
    router.refresh();
  }

  async function handleClone() {
    if (!confirm("לשכפל את האירוע?")) return;
    await fetch(`/api/events/${eventId}/clone`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/events/${eventId}`}
        className="text-primary-700 hover:text-primary-800 text-xs font-medium"
      >
        עריכה
      </Link>
      <button
        onClick={handleArchive}
        className="text-gray-500 hover:text-gray-700 text-xs font-medium"
      >
        {status === "active" ? "ארכיון" : "שחזור"}
      </button>
      <button
        onClick={handleClone}
        className="text-purple-600 hover:text-purple-700 text-xs font-medium"
      >
        שכפול
      </button>
    </div>
  );
}
