export function validatePassword(password: string): { ok: boolean; error?: string } {
  if (!password || typeof password !== "string") return { ok: false, error: "סיסמה חסרה" };
  if (password.length < 10) return { ok: false, error: "סיסמה חייבת להכיל לפחות 10 תווים" };
  if (password.length > 128) return { ok: false, error: "סיסמה ארוכה מדי (מקסימום 128 תווים)" };
  if (!/[a-zA-Z]/.test(password)) return { ok: false, error: "סיסמה חייבת להכיל לפחות אות אחת" };
  if (!/[0-9]/.test(password)) return { ok: false, error: "סיסמה חייבת להכיל לפחות ספרה אחת" };

  // Reject common weak passwords (lowercased check)
  const lower = password.toLowerCase();
  const weak = [
    "1234567890", "12345678", "password", "password1", "qwerty123", "qwertyuiop",
    "admin123", "letmein1", "welcome1", "iloveyou", "monkey123", "dragon123",
    "oren12345", "changeme", "passw0rd", "trustno1", "abc123456",
  ];
  if (weak.includes(lower)) return { ok: false, error: "סיסמה מוכרת - בחר סיסמה ייחודית" };

  // Reject all-same-character (e.g. "aaaaaaaa1")
  if (/^(.)\1{5,}/.test(password)) return { ok: false, error: "סיסמה לא יכולה להיות אותו תו חוזר" };

  // Reject simple sequences (1234567, abcdef, qwerty...)
  if (/01234|12345|23456|34567|45678|56789|abcdef|bcdefg|qwerty|asdfgh|zxcvbn/i.test(password)) {
    return { ok: false, error: "הסיסמה מכילה רצף צפוי - בחר משהו פחות סדרתי" };
  }

  return { ok: true };
}
