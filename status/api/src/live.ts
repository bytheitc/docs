// The last good public view for each tenant, held in memory.
//
// This is the part that makes the page honest under failure. If the database is unreachable, the
// page says so and shows the last readings it had, rather than going blank or 500ing — a status
// page that cannot render during an incident is the one thing it must never be.
import type { PublicStatus, Tenant } from "./types.js";

const MAX_AGE_MS = 60 * 60_000;

interface Entry { at: number; status: PublicStatus }
const cache = new Map<string, Entry>();

/**
 * Which tenant a hostname belongs to, remembered separately.
 *
 * Without this the fallback is useless: resolving status.example.org to a tenant is itself a
 * database read, so a database outage would answer "no status page here" — alarming, wrong, and
 * precisely when the page matters most. Hostnames change rarely, so holding them is cheap.
 */
const known = new Map<string, { at: number; tenant: Tenant }>();

export function remember(tenantId: string, status: PublicStatus): void {
  cache.set(tenantId, { at: Date.now(), status });
}

/** Remembered under its id and under every hostname, since both are ways in. */
export function rememberTenant(tenant: Tenant): void {
  const at = Date.now();
  known.set(tenant.id, { at, tenant });
  for (const h of tenant.hosts) known.set(h, { at, tenant });
}

/** The tenant last seen under this id or hostname, if it was seen recently enough to trust. */
export function cachedTenant(key: string): Tenant | null {
  const e = known.get(key);
  if (!e || Date.now() - e.at > MAX_AGE_MS) return null;
  return e.tenant;
}

/** The last good view, marked stale, or null if there isn't one or it is too old to be useful. */
export function lastKnown(tenantId: string): PublicStatus | null {
  const e = cache.get(tenantId);
  if (!e || Date.now() - e.at > MAX_AGE_MS) return null;
  return { ...e.status, stale: true };
}

export const forget = () => {
  cache.clear();
  known.clear();
};
