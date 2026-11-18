// From what a browser sends to a stored Hit. Everything that could identify a person stops here:
// the IP and user agent only feed the daily hash, the URL keeps its path and nothing else, and the
// referrer keeps its host.
import { createHash } from "node:crypto";
import type { Hit, Site } from "./store/types.js";

/** Crawlers, previews, monitors and headless browsers. Not exhaustive: the long tail is noise, not harm. */
const BOT = /bot\b|crawl|spider|slurp|facebookexternalhit|embedly|quora link preview|whatsapp|telegram|discord|skype|preview|headless|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptime|statuscake|monitor|curl\/|wget|python-requests|python-urllib|aiohttp|httpx|go-http-client|okhttp|java\/|libwww|node-fetch|undici|axios|postman|insomnia/i;

export const isBot = (ua: string): boolean => !ua || ua.length < 20 || BOT.test(ua);

export function browserOf(ua: string): string {
  if (/Edg(e|A|iOS)?\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser\//.test(ua)) return "Samsung Internet";
  if (/Firefox\/|FxiOS\//.test(ua)) return "Firefox";
  if (/Chrome\/|CriOS\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

export function osOf(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}

/** By viewport width, the way the layouts break. */
export function deviceOf(width: number): string {
  if (!Number.isFinite(width) || width <= 0) return "Unknown";
  if (width < 576) return "Mobile";
  if (width < 992) return "Tablet";
  if (width < 1440) return "Laptop";
  return "Desktop";
}

const bare = (host: string) => host.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");

/** True when `host` is one of the site's domains or a subdomain of one. */
export function hostAllowed(host: string, domains: string[]): boolean {
  const h = bare(host);
  return domains.some((d) => {
    const b = bare(d);
    return h === b || h.endsWith(`.${b}`);
  });
}

/** A path for counting: no query, no fragment, no trailing slash, bounded. Ids still show; they're the page. */
export function cleanPath(pathname: string): string {
  let p = pathname || "/";
  try { p = decodeURI(p); } catch { /* keep it encoded */ }
  if (p.length > 1) p = p.replace(/\/+$/, "") || "/";
  return p.slice(0, 300);
}

/** Custom event names: letters, digits, spaces and . : _ - only, at most 60 characters. */
export function eventName(raw: unknown): string | null {
  if (raw == null || raw === "" || raw === "pageview") return "pageview";
  if (typeof raw !== "string") return null;
  const n = raw.trim().slice(0, 60);
  return /^[\p{L}\p{N} .:_-]+$/u.test(n) ? n : null;
}

export interface Beacon {
  /** Site id. */
  s?: unknown;
  /** Event name; absent for a page view. */
  n?: unknown;
  /** The page's full URL. Only its host (checked) and path (kept) are used. */
  u?: unknown;
  /** document.referrer, sent with the first page view of a visit only. */
  r?: unknown;
  /** Viewport width. */
  w?: unknown;
}

export type BeaconResult = { hit: Omit<Hit, "visitor" | "site"> & { host: string } } | { drop: string };

/** Parses a beacon against its site. Returns why it was dropped instead of throwing: drops are normal. */
export function readBeacon(b: Beacon, site: Site, now: Date, headers: { country?: string; ua: string }): BeaconResult {
  const name = eventName(b.n);
  if (!name) return { drop: "bad event name" };
  let url: URL;
  try { url = new URL(String(b.u ?? "")); } catch { return { drop: "bad url" }; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { drop: "bad url" };
  if (!hostAllowed(url.hostname, site.domains)) return { drop: "host not allowed" };

  let ref = "";
  if (typeof b.r === "string" && b.r) {
    try {
      const r = new URL(b.r);
      // Moving around the site (or between its own domains) is not a referral.
      if ((r.protocol === "https:" || r.protocol === "http:") && !hostAllowed(r.hostname, site.domains)) ref = bare(r.hostname).slice(0, 100);
    } catch { /* not a URL: ignore */ }
  }
  const source = (url.searchParams.get("utm_source") ?? url.searchParams.get("ref") ?? "").trim().toLowerCase().slice(0, 60);
  const country = /^[A-Za-z]{2}$/.test(headers.country ?? "") && headers.country!.toUpperCase() !== "XX" ? headers.country!.toUpperCase() : "";

  return {
    hit: {
      host: url.hostname,
      ts: now,
      day: now.toISOString().slice(0, 10),
      name,
      path: cleanPath(url.pathname),
      ref,
      source,
      country,
      device: deviceOf(Number(b.w)),
      browser: browserOf(headers.ua),
      os: osOf(headers.ua),
    },
  };
}

/** The day's visitor id: unlinkable across days and sites once the salt is gone. */
export function visitorHash(salt: string, siteId: string, ip: string, ua: string): string {
  return createHash("sha256").update(`${salt}\n${siteId}\n${ip}\n${ua}`).digest("base64url").slice(0, 22);
}
