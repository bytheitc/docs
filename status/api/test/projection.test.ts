// The public view is the security boundary of this service. These tests exist to fail loudly if a
// check URL, a bearer header or a diagnostic string ever reaches it.
import { strict as assert } from "node:assert";
import test from "node:test";
import { project, summarise, worst } from "../src/projection.js";
import type { CheckResult, DayBucket, Incident, Service, Tenant } from "../src/types.js";
import { dayOf } from "../src/util.js";

const NOW = new Date("2026-11-12T12:00:00Z");
const ago = (mins: number) => new Date(NOW.getTime() - mins * 60_000);
const day = (n: number) => dayOf(new Date(NOW.getTime() - n * 864e5));

// Deliberately full of things that must never be published.
const SECRET_URL = "https://internal.example.net/health?token=SUPERSECRET";
const SECRET_HEADER = "Bearer SHOULD-NEVER-APPEAR";

const tenant: Tenant = {
  id: "itc", name: "Islamic Tech Collective", hosts: ["status.example.org"],
  brand: { tagline: "", supportUrl: "", accent: "#0f766e", logoUrl: "" },
  adminTokenHash: "a".repeat(64), createdAt: new Date("2026-01-01T00:00:00Z"),
};

const service = (over: Partial<Service> = {}): Service => ({
  id: "svc1", tenantId: "itc", name: "Portal", description: "Contributor accounts and claims.",
  group: "Services", order: 0, listed: true, createdAt: NOW,
  check: {
    kind: "http", url: SECRET_URL, method: "GET", expectStatus: [200],
    timeoutMs: 10_000, degradedMs: 2000, headers: { authorization: SECRET_HEADER },
    assert: { path: "ok", equals: true },
  },
  ...over,
});

const result = (over: Partial<CheckResult> = {}): CheckResult => ({
  serviceId: "svc1", tenantId: "itc", at: ago(1), state: "up", ms: 123,
  status: 200, error: "internal diagnostic text", ...over,
});

const base = { tenant, days: 7, now: NOW, buckets: [] as DayBucket[], incidents: [] as Incident[] };

/* ---------------- the boundary ---------------- */

test("no private field survives the projection", () => {
  const out = project({ ...base, services: [service()], latest: { svc1: result() } });
  const json = JSON.stringify(out);
  assert.equal(json.includes("SUPERSECRET"), false, "the check URL must not be published");
  assert.equal(json.includes("SHOULD-NEVER-APPEAR"), false, "check headers must not be published");
  assert.equal(json.includes("internal.example.net"), false, "the internal host must not be published");
  assert.equal(json.includes("internal diagnostic"), false, "probe errors must not be published");
  assert.equal(json.includes(tenant.adminTokenHash), false, "the admin token digest must not be published");
  assert.equal(json.includes("\"status\":200"), false, "the upstream HTTP status must not be published");
});

test("the projected service carries only the agreed fields", () => {
  const out = project({ ...base, services: [service()], latest: { svc1: result() } });
  assert.deepEqual(
    Object.keys(out.services[0]).sort(),
    ["description", "group", "history", "id", "name", "responseMs", "state"],
  );
});

test("a service that is watched but not listed never appears", () => {
  const out = project({
    ...base,
    services: [service(), service({ id: "hidden", name: "Internal queue", listed: false })],
    latest: { svc1: result(), hidden: result({ serviceId: "hidden", state: "down" }) },
  });
  assert.equal(out.services.length, 1);
  assert.equal(JSON.stringify(out).includes("Internal queue"), false);
  assert.equal(out.overall, "up", "a hidden service's state must not move the headline either");
});

test("response times are rounded, not reported precisely", () => {
  const out = project({ ...base, services: [service()], latest: { svc1: result({ ms: 1237 }) } });
  assert.equal(out.services[0].responseMs, 1250);
});

/* ---------------- states ---------------- */

test("a stale probe reads as unknown rather than as still up", () => {
  const out = project({ ...base, services: [service()], latest: { svc1: result({ at: ago(45) }) } });
  assert.equal(out.services[0].state, "unknown");
  assert.equal(out.services[0].responseMs, null);
});

test("a service that has never been probed is unknown, not down", () => {
  const out = project({ ...base, services: [service()], latest: {} });
  assert.equal(out.services[0].state, "unknown");
});

test("the worst service sets the headline", () => {
  const out = project({
    ...base,
    services: [service(), service({ id: "b", name: "CMS", order: 1 })],
    latest: { svc1: result(), b: result({ serviceId: "b", state: "down" }) },
  });
  assert.equal(out.overall, "down");
  assert.match(out.summary, /CMS is down/);
});

test("worst() orders states the way a reader would", () => {
  assert.equal(worst(["up", "unknown"]), "unknown");
  assert.equal(worst(["up", "degraded", "unknown"]), "degraded");
  assert.equal(worst(["degraded", "down"]), "down");
  assert.equal(worst([]), "up");
});

/* ---------------- incidents ---------------- */

const incident = (over: Partial<Incident> = {}): Incident => ({
  id: "i1", tenantId: "itc", title: "Sign-in is failing", impact: "major", status: "investigating",
  serviceIds: ["svc1"], startedAt: ago(30),
  updates: [{ at: ago(30), status: "investigating", body: "We're looking into it." }],
  ...over,
});

test("a declared incident outranks checks that happen to be passing", () => {
  const out = project({ ...base, services: [service()], latest: { svc1: result() }, incidents: [incident()] });
  assert.equal(out.overall, "down", "a human saying it is broken beats a green check");
});

test("scheduled maintenance is not an outage", () => {
  const out = project({
    ...base, services: [service()], latest: { svc1: result() },
    incidents: [incident({ impact: "maintenance", scheduled: true })],
  });
  assert.equal(out.overall, "up");
  assert.match(out.summary, /Maintenance is scheduled/);
});

test("a resolved incident stops affecting the headline", () => {
  const out = project({
    ...base, services: [service()], latest: { svc1: result() },
    incidents: [incident({ status: "resolved", resolvedAt: ago(5) })],
  });
  assert.equal(out.overall, "up");
  assert.equal(out.incidents[0].resolvedAt, ago(5).toISOString());
});

test("incidents name services rather than exposing ids of things that no longer exist", () => {
  const out = project({
    ...base, services: [service()], latest: {},
    incidents: [incident({ serviceIds: ["svc1", "deleted-service"] })],
  });
  assert.deepEqual(out.incidents[0].services, ["Portal"]);
});

test("incident updates are ordered oldest first, whatever order they were stored in", () => {
  const out = project({
    ...base, services: [service()], latest: {},
    incidents: [incident({
      updates: [
        { at: ago(5), status: "monitoring", body: "Watching it." },
        { at: ago(30), status: "investigating", body: "Looking." },
      ],
    })],
  });
  assert.deepEqual(out.incidents[0].updates.map((u) => u.body), ["Looking.", "Watching it."]);
});

/* ---------------- history ---------------- */

test("history is one entry per day, oldest first, with gaps left as unknown", () => {
  const buckets: DayBucket[] = [
    { serviceId: "svc1", tenantId: "itc", day: day(0), total: 100, down: 0, degraded: 0, msSum: 1000, msCount: 100 },
    { serviceId: "svc1", tenantId: "itc", day: day(3), total: 100, down: 4, degraded: 0, msSum: 1000, msCount: 100 },
  ];
  const out = project({ ...base, services: [service()], latest: { svc1: result() }, buckets });
  const h = out.services[0].history;
  assert.equal(h.length, 7);
  assert.equal(h[0].day < h[6].day, true, "oldest first");
  assert.equal(h[6].state, "up");
  assert.equal(h[6].uptime, 100);
  const bad = h.find((x) => x.day === day(3))!;
  assert.equal(bad.state, "down");
  assert.equal(bad.uptime, 96);
  assert.equal(h.find((x) => x.day === day(1))!.state, "unknown");
  assert.equal(h.find((x) => x.day === day(1))!.uptime, null);
});

test("a day with only slow checks reads as degraded, not down", () => {
  const buckets: DayBucket[] = [
    { serviceId: "svc1", tenantId: "itc", day: day(0), total: 50, down: 0, degraded: 7, msSum: 500, msCount: 50 },
  ];
  const out = project({ ...base, services: [service()], latest: { svc1: result() }, buckets });
  assert.equal(out.services[0].history[6].state, "degraded");
  assert.equal(out.services[0].history[6].uptime, 100, "slow is still up, so uptime stays whole");
});

/* ---------------- the sentence at the top ---------------- */

test("the summary is written for a reader, not assembled from codes", () => {
  const svc = (name: string, state: "up" | "down" | "degraded") =>
    ({ id: name, name, description: "", group: "", state, responseMs: null, history: [] });
  assert.equal(summarise("up", [svc("A", "up")], []), "All systems operational.");
  assert.equal(summarise("down", [svc("Portal", "down")], []), "Portal is down.");
  assert.equal(summarise("down", [svc("A", "down"), svc("B", "down")], []), "2 services are down.");
  assert.equal(summarise("degraded", [svc("CMS", "degraded")], []), "CMS is slower than usual.");
  assert.equal(summarise("down", [svc("A", "down"), svc("B", "degraded")], []), "A down, B degraded.");
  assert.equal(summarise("up", [], []), "No services are being monitored yet.");
});
