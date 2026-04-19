"use client";
import { useEffect, useState } from "react";

type Me = {
  password_age_days: number | null;
  rotation_warning: boolean;
  rotation_threshold_days: number;
  two_factor_enabled: boolean;
};

const DISMISS_ROT = "pw-rotation-banner-dismissed-until";
const DISMISS_2FA = "pw-2fa-banner-dismissed-until";

export default function PasswordRotationBanner() {
  const [me, setMe] = useState<Me | null>(null);
  const [dismissedRot, setDismissedRot] = useState(false);
  const [dismissed2fa, setDismissed2fa] = useState(false);

  useEffect(() => {
    if (Number(localStorage.getItem(DISMISS_ROT) || 0) > Date.now()) setDismissedRot(true);
    if (Number(localStorage.getItem(DISMISS_2FA) || 0) > Date.now()) setDismissed2fa(true);
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then(setMe).catch(() => {});
  }, []);

  if (!me) return null;

  const show2fa = !me.two_factor_enabled && !dismissed2fa;
  const showRot = me.rotation_warning && !dismissedRot;
  if (!show2fa && !showRot) return null;

  const dismiss = (key: string, setter: (v: boolean) => void) => {
    localStorage.setItem(key, String(Date.now() + 24 * 60 * 60 * 1000));
    setter(true);
  };

  return (
    <>
      {show2fa && (
        <div className="bg-red-50 border-b border-red-300 px-4 py-3 text-sm text-red-900 flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
          <div className="flex-1">
            <span className="font-bold">🛡️ 2FA לא מופעל: </span>
            מומלץ להפעיל אימות דו-שלבי ב-
            <a href="/users" className="underline font-semibold">ניהול משתמשים</a>
            . זה חוסם גישה גם אם הסיסמה דלפה.
          </div>
          <button onClick={() => dismiss(DISMISS_2FA, setDismissed2fa)} className="text-xs px-3 py-1 rounded bg-red-200 hover:bg-red-300 transition shrink-0">
            תזכיר לי מחר
          </button>
        </div>
      )}
      {showRot && (
        <div className="bg-amber-50 border-b border-amber-300 px-4 py-3 text-sm text-amber-900 flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
          <div className="flex-1">
            <span className="font-bold">🔐 התראת אבטחה: </span>
            הסיסמה שלך בת {me.password_age_days} ימים (מעל ה-{me.rotation_threshold_days} המומלצים). כדאי להחליף סיסמה ב-
            <a href="/users" className="underline font-semibold">ניהול משתמשים</a>.
          </div>
          <button onClick={() => dismiss(DISMISS_ROT, setDismissedRot)} className="text-xs px-3 py-1 rounded bg-amber-200 hover:bg-amber-300 transition shrink-0">
            תזכיר לי מחר
          </button>
        </div>
      )}
    </>
  );
}
