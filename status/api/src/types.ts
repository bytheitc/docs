// The status service's own shapes.
//
// The single rule this file exists to enforce: a Service carries BOTH the private detail needed to
// probe it (url, headers, which may hold a token) and the public detail shown on the page. The two
// are never the same object outside this module — everything a visitor sees is built by
// projection.ts, which is allowed to read these and chooses what crosses the boundary.

/** A status site. One tenant per domain: status.itc.org and status.example.com are two tenants. */
export interface Tenant {
  id: string;
  name: string;
  /** Hostnames that resolve to this tenant. The web matches the request's Host against these. */
  hosts: string[];
  /** Shown on the page. All optional, all public by definition. */
  brand: {
    tagline: string;
    /** Where to go for help when something is broken. */
    supportUrl: string;
    /** A CSS colour for the accent. Validated on write: this reaches a style attribute. */
    accent: string;
    logoUrl: string;
  };
  /** Bcrypt-style hash is overkill for a machine token; this is a SHA-256 hex digest. */
  adminTokenHash: string;
  createdAt: Date;
  disabled?: boolean;
}

export type CheckKind = "http";

/** How to probe a service. Everything here is private: it can hold URLs and credentials. */
export interface Check {
  kind: CheckKind;
  url: string;
  method: string;
  /** Any of these response statuses counts as up. */
  expectStatus: number[];
  timeoutMs: number;
  /** Slower than this, but still a pass, reports as degraded rather than up. */
  degradedMs: number;
  /** Sent with the probe. May hold a bearer token, so it never leaves the server. */
  headers?: Record<string, string>;
  /**
   * Optional assertion against a JSON body: a dotted path and the value it must equal.
   * `{ path: "ok", equals: true }` turns ITC's own /health into a real check rather than a ping.
   */
  assert?: { path: string; equals: unknown };
}

export type State = "up" | "degraded" | "down" | "unknown";

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  /** One line, shown to visitors. Say what breaks for them, not which box it runs on. */
  description: string;
  /** Services are grouped on the page; the group name is public. */
  group: string;
  order: number;
  check: Check;
  /** A service can be watched without being listed. Hidden ones never reach the public view. */
  listed: boolean;
  createdAt: Date;
}

/** One probe. `error` is diagnostic detail and is never projected. */
export interface CheckResult {
  serviceId: string;
  tenantId: string;
  at: Date;
  state: State;
  ms: number;
  /** HTTP status, when there was one. */
  status?: number;
  /** Why it failed, for whoever runs the service. Private. */
  error?: string;
}

/** A day of probes for one service, rolled up so history stays cheap and bounded. */
export interface DayBucket {
  serviceId: string;
  tenantId: string;
  /** YYYY-MM-DD, UTC. */
  day: string;
  total: number;
  down: number;
  degraded: number;
  /** Sum and count, so an average survives compaction without keeping every probe. */
  msSum: number;
  msCount: number;
}

export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";
export type Impact = "minor" | "major" | "critical" | "maintenance";

export interface IncidentUpdate {
  at: Date;
  status: IncidentStatus;
  body: string;
}

/**
 * A human-written account of what is happening. The checks say something is down; only this says
 * what it means for the person reading, and that is the part a status page exists for.
 */
export interface Incident {
  id: string;
  tenantId: string;
  title: string;
  impact: Impact;
  status: IncidentStatus;
  /** Services this affects. May be empty: not everything that breaks has a check. */
  serviceIds: string[];
  startedAt: Date;
  resolvedAt?: Date;
  /** Newest last. The first update is written when the incident is opened. */
  updates: IncidentUpdate[];
  /** Planned work, announced ahead of time, is an incident with a start in the future. */
  scheduled?: boolean;
}

/* ------------------------------------------------------------------ */
/* The public view: everything below this line is safe to serve        */
/* ------------------------------------------------------------------ */

export interface PublicService {
  id: string;
  name: string;
  description: string;
  group: string;
  state: State;
  /** Rounded to 50ms. Precise timings are a fingerprint, and nobody needs the precision. */
  responseMs: number | null;
  /** Oldest day first. One entry per day, up to the window asked for. */
  history: { day: string; state: State; uptime: number | null }[];
}

export interface PublicIncident {
  id: string;
  title: string;
  impact: Impact;
  status: IncidentStatus;
  /** Names, not ids, so the page needs nothing else to render it. */
  services: string[];
  startedAt: string;
  resolvedAt: string | null;
  scheduled: boolean;
  updates: { at: string; status: IncidentStatus; body: string }[];
}

export interface PublicStatus {
  tenant: { id: string; name: string; brand: Tenant["brand"] };
  /** The worst state among listed services, or the impact of an open incident. */
  overall: State;
  /** One sentence, already written for the reader. */
  summary: string;
  services: PublicService[];
  incidents: PublicIncident[];
  updatedAt: string;
  /** True when this was served from the last good copy because the database was unreachable. */
  stale?: boolean;
  /** Whether this deployment can actually deliver email. The page hides the form when it cannot. */
  subscriptions?: boolean;
}

/* ------------------------------------------------------------------ */
/* Subscribers                                                         */
/* ------------------------------------------------------------------ */

export type SubscriberStatus = "pending" | "confirmed" | "unsubscribed";

/**
 * Someone who asked to be told when this tenant's status changes.
 *
 * Double opt-in, the same shape the Collective's newsletter uses: an address is "pending" until the
 * person clicks the link, and nothing is ever sent to a pending address except that one link.
 * A status page is a tempting way to mail a stranger repeatedly, so the counters matter here too.
 */
export interface Subscriber {
  /** Opaque, random, and the only thing an unsubscribe link carries. Useless without the secret. */
  id: string;
  /** Lower-cased. One record per address per tenant: lists do not cross tenants. */
  email: string;
  tenantId: string;
  status: SubscriberStatus;
  /** SHA-256 of the confirmation token. The token itself only ever exists in the email. */
  confirmTokenHash?: string;
  confirmExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  unsubscribedAt?: Date;
  /** How many confirmation emails have gone to this address, so we cannot be used to pester it. */
  confirmSends: number;
  lastConfirmSentAt?: Date;
}

export interface StatusStore {
  kind: string;
  close(): Promise<void>;

  getTenant(id: string): Promise<Tenant | null>;
  getTenantByHost(host: string): Promise<Tenant | null>;
  listTenants(): Promise<Tenant[]>;
  addTenant(t: Tenant): Promise<void>;
  updateTenant(id: string, patch: Partial<Tenant>): Promise<void>;

  listServices(tenantId: string): Promise<Service[]>;
  listAllServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | null>;
  addService(s: Service): Promise<void>;
  updateService(id: string, patch: Partial<Service>): Promise<void>;
  deleteService(id: string): Promise<void>;

  recordResult(r: CheckResult): Promise<void>;
  latestResults(tenantId: string): Promise<Record<string, CheckResult>>;
  buckets(tenantId: string, sinceDay: string): Promise<DayBucket[]>;
  /** Probes older than this are dropped; the day buckets keep the history. */
  prune(before: Date): Promise<number>;

  getSubscriber(tenantId: string, email: string): Promise<Subscriber | null>;
  putSubscriber(sub: Subscriber): Promise<void>;
  patchSubscriber(tenantId: string, email: string, patch: Partial<Subscriber>): Promise<void>;
  subscriberById(id: string): Promise<Subscriber | null>;
  subscriberByConfirmHash(hash: string): Promise<Subscriber | null>;
  /** Confirmed addresses for a tenant, which is who a notification goes to. */
  listConfirmedSubscribers(tenantId: string): Promise<Subscriber[]>;
  subscriberCounts(tenantId: string): Promise<{ pending: number; confirmed: number; unsubscribed: number }>;

  listIncidents(tenantId: string, opts?: { openOnly?: boolean; limit?: number }): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident | null>;
  addIncident(i: Incident): Promise<void>;
  updateIncident(id: string, patch: Partial<Incident>): Promise<void>;
}
