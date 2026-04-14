import crypto from "crypto";

function getKey(): string {
  return process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "default-unsubscribe-key";
}

export function signEmailToken(email: string): string {
  const data = email.toLowerCase().trim();
  const hmac = crypto.createHmac("sha256", getKey()).update(data).digest("hex").slice(0, 16);
  return hmac;
}

export function verifyEmailToken(email: string, token: string): boolean {
  const expected = signEmailToken(email);
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token || "")); } catch { return false; }
}
