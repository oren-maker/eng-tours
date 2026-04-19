"use client";
import { useEffect, useState } from "react";

type Me = {
  password_age_days: number | null;
  rotation_warning: boolean;
  rotation_threshold_days: number;
};

const DISMISS_KEY = "pw-rotation-banner-dismissed-until";

export default function PasswordRotationBanner() {
  const [me, setMe] = useState<Me | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (until > Date.now()) setDismissed(true);
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then(setMe).catch(() => {});
  }, []);

  if (!me || !me.rotation_warning || dismissed) return null;

  const dismiss = () => {
    const until = Date.now() + 24 * 60 * 60 * 1000; // 1 day
    localStorage.setItem(DISMISS_KEY, String(until));
    setDismissed(true);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-300 px-4 py-3 text-sm text-amber-900 flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
      <div className="flex-1">
        <span className="font-bold">🔐 התראת אבטחה: </span>
        הסיסמה שלך בת {me.password_age_days} ימים (מעל ה-{me.rotation_threshold_days} המומלצים). כדאי להחליף סיסמה ב-
        <a href="/users" className="underline font-semibold">ניהול משתמשים</a>.
      </div>
      <button
        onClick={dismiss}
        className="text-xs px-3 py-1 rounded bg-amber-200 hover:bg-amber-300 transition shrink-0"
      >
        תזכיר לי מחר
      </button>
    </div>
  );
}
