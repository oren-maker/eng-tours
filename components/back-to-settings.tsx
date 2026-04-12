"use client";

import Link from "next/link";

export default function BackToSettings() {
  return (
    <div className="mb-4">
      <Link
        href="/settings-hub"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700 transition-colors"
      >
        <span>←</span>
        <span>חזרה להגדרות כלליות</span>
      </Link>
    </div>
  );
}
