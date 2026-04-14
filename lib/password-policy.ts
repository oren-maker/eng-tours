export function validatePassword(password: string): { ok: boolean; error?: string } {
  if (!password || typeof password !== "string") return { ok: false, error: "סיסמה חסרה" };
  if (password.length < 8) return { ok: false, error: "סיסמה חייבת להכיל לפחות 8 תווים" };
  if (password.length > 128) return { ok: false, error: "סיסמה ארוכה מדי (מקסימום 128 תווים)" };
  if (!/[a-zA-Z]/.test(password)) return { ok: false, error: "סיסמה חייבת להכיל לפחות אות אחת" };
  if (!/[0-9]/.test(password)) return { ok: false, error: "סיסמה חייבת להכיל לפחות ספרה אחת" };
  // Reject common weak passwords
  const weak = ["12345678", "password", "qwerty123", "admin123", "letmein1"];
  if (weak.includes(password.toLowerCase())) return { ok: false, error: "סיסמה חלשה מדי" };
  return { ok: true };
}
