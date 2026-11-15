// A fixed-window rate limit, shared across every instance of this service via AccountsStore
// (backed by Mongo) rather than an in-memory counter — a counter kept in one process's memory
// never sees the requests another instance received, which makes it no limit at all once this
// runs as more than one process.
import { requireAccountsStore } from "./store/index.js";

export async function rateLimit(key: string, limit = 20, windowMs = 60_000): Promise<boolean> {
  return requireAccountsStore().checkRateLimit(key, limit, windowMs);
}

export function clientIp(headers: Headers): string {
  return (headers.get("x-forwarded-for")?.split(",")[0] ?? headers.get("x-real-ip") ?? "local").trim();
}
