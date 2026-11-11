// A basic fixed-window rate limit, in memory per server process. Enough to blunt hammering of the auth endpoints;
// a multi-instance deployment should put a shared limiter (or the platform's) in front.
const buckets = new Map<string, { start: number; n: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    buckets.set(key, { start: now, n: 1 });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (now - v.start > windowMs) buckets.delete(k);
    return true;
  }
  b.n++;
  return b.n <= limit;
}

export function clientIp(headers: Headers): string {
  return (headers.get("x-forwarded-for")?.split(",")[0] ?? headers.get("x-real-ip") ?? "local").trim();
}
