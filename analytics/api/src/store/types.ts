export interface Site {
  /** Public on purpose: it sits in every page's script tag. It authorizes counting, nothing else. */
  id: string;
  slug: string;
  name: string;
  /** Hostnames whose pages count for this site. A subdomain of one counts too (www., preview hosts). */
  domains: string[];
  createdAt: Date;
  createdBy: string;
}

/**
 * One page view or custom event. Nothing in it identifies a person: no IP, no cookie, no query
 * string, and `visitor` is a hash under a salt that is thrown away after its day, so the same
 * person is a different visitor tomorrow and nobody, us included, can link the two.
 */
export interface Hit {
  site: string;
  ts: Date;
  /** UTC day, YYYY-MM-DD. Visitors are counted per day: that is as far as a daily salt reaches. */
  day: string;
  /** "pageview", or a custom event's name. */
  name: string;
  path: string;
  /** Referring host ("" when typed in, bookmarked, or from this site itself). */
  ref: string;
  /** utm_source or ref= from the landing URL. */
  source: string;
  /** ISO 3166 alpha-2 from the host's geo header, "" when the host gives none. */
  country: string;
  device: string;
  browser: string;
  os: string;
  visitor: string;
}

export type Dimension = "path" | "ref" | "source" | "country" | "device" | "browser" | "os";
export const DIMENSIONS: Dimension[] = ["path", "ref", "source", "country", "device", "browser", "os"];

export interface Row { key: string; visitors: number; count: number }

export interface Stats {
  /** Sum of each day's unique visitors. */
  visitors: number;
  pageviews: number;
  /** One entry per day in the range, oldest first, zero-filled. */
  days: { day: string; visitors: number; pageviews: number }[];
  /** Top 10 per dimension, page views only, by visitors. */
  top: Record<Dimension, Row[]>;
  /** Custom events by name. */
  events: Row[];
}

export interface AnalyticsStore {
  createSite(s: Site): Promise<boolean>;
  listSites(): Promise<Site[]>;
  getSite(id: string): Promise<Site | null>;
  getSiteBySlug(slug: string): Promise<Site | null>;
  updateDomains(id: string, domains: string[]): Promise<Site | null>;

  /** Today's salt, the same for every instance, created on first use and deleted after two days. */
  salt(day: string): Promise<string>;
  record(hit: Hit, retentionDays: number): Promise<void>;
  /** Days from `from` to `to` inclusive (YYYY-MM-DD, UTC). */
  stats(siteId: string, from: string, to: string): Promise<Stats>;
  /** Distinct visitors with a page view since `since`. */
  live(siteId: string, since: Date): Promise<number>;
  close(): Promise<void>;
}
