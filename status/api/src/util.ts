import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

/** Compare a presented token against a stored digest without leaking length or position. */
export function tokenMatches(presented: string, storedHash: string): boolean {
  const a = Buffer.from(sha256(presented), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** YYYY-MM-DD in UTC. Days are UTC everywhere so a tenant's history never shifts with the clocks. */
export const dayOf = (d: Date): string => d.toISOString().slice(0, 10);

export function daysBack(n: number, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayOf(new Date(from.getTime() - i * 864e5)));
  return out;
}

/** Slugs are used in URLs and as tenant ids. */
export const SLUG = /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/;
export const isSlug = (s: string) => SLUG.test(s);

/** Hostnames are compared lowercase and without a port. */
export const normaliseHost = (h: string) => h.trim().toLowerCase().split(":")[0].replace(/\.$/, "");

/**
 * The accent colour reaches a style attribute, so it is allowlisted rather than escaped: a hex
 * triplet or a plain CSS colour keyword. Anything else falls back, because "it looked fine" is not
 * a safety argument when the value came from a tenant's admin.
 */
const COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$|^[a-z]{3,20}$/i;
export const safeColour = (v: string, fallback = "#0f766e") => (COLOUR.test(v.trim()) ? v.trim() : fallback);

/** Only http(s), and only absolute. Used for logos, support links and check targets. */
export function httpUrl(v: string): string | null {
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Escapes text for HTML. Everything interpolated into a page goes through this. */
export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Reads a dotted path out of a parsed JSON body, for check assertions. */
export function at(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc != null && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), obj);
}
