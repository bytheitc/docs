// The boundary between what this service knows and what a visitor is shown.
//
// Everything served publicly is built here, by naming each field explicitly. Nothing is spread from
// a stored object, because a spread is how a check URL, a bearer header or a stack trace ends up on
// a public page the first time someone adds a field upstream. The tests assert that.
import type {
  CheckResult, DayBucket, Incident, PublicIncident, PublicService, PublicStatus, Service, State, Tenant,
} from "./types.js";
import { daysBack, dayOf } from "./util.js";

const RANK: Record<State, number> = { up: 0, unknown: 1, degraded: 2, down: 3 };

export const worst = (states: State[]): State =>
  states.reduce<State>((acc, s) => (RANK[s] > RANK[acc] ? s : acc), "up");

/** Timings are rounded hard: nobody reads a status page for millisecond precision. */
const roundMs = (ms: number): number => Math.max(50, Math.round(ms / 50) * 50);

/** A probe older than three intervals tells you nothing current. */
const STALE_AFTER_MS = 10 * 60_000;

function stateOf(result: CheckResult | undefined, now: Date): State {
  if (!result) return "unknown";
  if (now.getTime() - result.at.getTime() > STALE_AFTER_MS) return "unknown";
  return result.state;
}

/** A day is down if anything failed in it, degraded if anything was slow, and unknown if unprobed. */
function dayState(b: DayBucket | undefined): { state: State; uptime: number | null } {
  if (!b || !b.total) return { state: "unknown", uptime: null };
  const uptime = Math.round(((b.total - b.down) / b.total) * 1000) / 10;
  if (b.down) return { state: "down", uptime };
  if (b.degraded) return { state: "degraded", uptime };
  return { state: "up", uptime };
}

export function projectIncident(i: Incident, serviceNames: Map<string, string>): PublicIncident {
  return {
    id: i.id,
    title: i.title,
    impact: i.impact,
    status: i.status,
    // Ids mean nothing to a reader, and a hidden service's name is still not secret: it was chosen
    // to be shown. A service that no longer exists simply drops out.
    services: i.serviceIds.map((id) => serviceNames.get(id)).filter((n): n is string => Boolean(n)),
    startedAt: i.startedAt.toISOString(),
    resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
    scheduled: Boolean(i.scheduled),
    updates: i.updates
      .slice()
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((u) => ({ at: u.at.toISOString(), status: u.status, body: u.body })),
  };
}

/** The sentence at the top of the page, written so it can be read without the rest of the page. */
export function summarise(overall: State, services: PublicService[], openIncidents: PublicIncident[]): string {
  const maintenance = openIncidents.filter((i) => i.scheduled);
  if (overall === "up" && maintenance.length) return "All systems operational. Maintenance is scheduled.";
  if (overall === "up") return services.length ? "All systems operational." : "No services are being monitored yet.";

  const broken = services.filter((s) => s.state === "down");
  const slow = services.filter((s) => s.state === "degraded");
  const name = (list: PublicService[]) =>
    list.length === 1 ? list[0].name : `${list.length} services`;

  if (broken.length && slow.length) return `${name(broken)} down, ${name(slow)} degraded.`;
  if (broken.length) return broken.length === 1 ? `${broken[0].name} is down.` : `${broken.length} services are down.`;
  if (slow.length) return slow.length === 1 ? `${slow[0].name} is slower than usual.` : `${slow.length} services are degraded.`;
  return "Some services have not reported recently.";
}

export interface ProjectInput {
  tenant: Tenant;
  services: Service[];
  latest: Record<string, CheckResult>;
  buckets: DayBucket[];
  incidents: Incident[];
  days: number;
  now?: Date;
}

export function project({ tenant, services, latest, buckets, incidents, days, now = new Date() }: ProjectInput): PublicStatus {
  const window = daysBack(days, now);
  const byService = new Map<string, Map<string, DayBucket>>();
  for (const b of buckets) {
    if (!byService.has(b.serviceId)) byService.set(b.serviceId, new Map());
    byService.get(b.serviceId)!.set(b.day, b);
  }

  // Hidden services are watched but not shown. They are dropped here, before anything else reads
  // the list, so they cannot leak through history, incidents or the summary.
  const listed = services
    .filter((s) => s.listed)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const publicServices: PublicService[] = listed.map((s) => {
    const result = latest[s.id];
    const state = stateOf(result, now);
    const bucketsFor = byService.get(s.id);
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      group: s.group,
      state,
      responseMs: result && state !== "unknown" ? roundMs(result.ms) : null,
      history: window.map((day) => ({ day, ...dayState(bucketsFor?.get(day)) })),
    };
  });

  const names = new Map(services.map((s) => [s.id, s.name]));
  const open = incidents.filter((i) => i.status !== "resolved");
  const publicIncidents = incidents
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .map((i) => projectIncident(i, names));

  // A declared incident outranks the probes: a human saying "this is broken" beats a check that
  // happens to be passing, and scheduled maintenance is not an outage.
  const checked = worst(publicServices.map((s) => s.state));
  const declared: State = open.some((i) => !i.scheduled && (i.impact === "critical" || i.impact === "major"))
    ? "down"
    : open.some((i) => !i.scheduled)
      ? "degraded"
      : "up";
  const overall = worst([checked, declared]);

  return {
    tenant: { id: tenant.id, name: tenant.name, brand: tenant.brand },
    overall,
    summary: summarise(overall, publicServices, publicIncidents.filter((i) => i.status !== "resolved")),
    services: publicServices,
    incidents: publicIncidents,
    updatedAt: now.toISOString(),
  };
}

export { dayOf };
