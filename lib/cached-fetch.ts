// Client-side cache wrapper - 10 minute TTL
// Caches API responses in memory to reduce DB calls

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function cachedFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const cacheKey = url + (options?.body ? JSON.stringify(options.body) : "");
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  const res = await fetch(url, options);
  const data = await res.json();

  if (res.ok) {
    cache.set(cacheKey, { data, timestamp: now });
  }

  return data as T;
}

// Invalidate cache entries matching a pattern (e.g. "/api/events")
export function invalidateCache(pattern: string) {
  const keys = Array.from(cache.keys());
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

// Clear all cache
export function clearCache() {
  cache.clear();
}
