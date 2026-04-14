// Simple in-memory sliding-window rate limiter. Per-process only
// (fine for single Vercel instance; for distributed use Upstash/Redis).
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const e = buckets.get(key);
  if (!e || e.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (e.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((e.resetAt - now) / 1000) };
  }
  e.count++;
  return { ok: true, remaining: limit - e.count, retryAfter: 0 };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
