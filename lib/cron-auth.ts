import crypto from "crypto";

/** Returns true if request carries valid CRON_SECRET header or Vercel cron user-agent. */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") || request.headers.get("x-cron-secret") || "";
  const ua = request.headers.get("user-agent") || "";

  // Vercel Cron uses 'vercel-cron' user-agent with Authorization: Bearer <CRON_SECRET>
  if (ua.includes("vercel-cron") && secret) {
    const token = header.replace(/^Bearer\s+/i, "");
    if (token && secret && token.length === secret.length) {
      try { return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret)); } catch { return false; }
    }
    return false;
  }

  // Manual call must carry x-cron-secret header
  if (!secret) return false;
  const provided = header.replace(/^Bearer\s+/i, "");
  if (!provided || provided.length !== secret.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(secret)); } catch { return false; }
}
