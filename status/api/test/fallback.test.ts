// What visitors see when the status service's own database fails.
//
// This is the scenario the whole design is pointed at, so it is tested against the real app over a
// real socket rather than by calling the handler: the failure has to survive routing, the tenant
// lookup and rendering, not just the one function that happens to throw.
import { strict as assert } from "node:assert";
import { request } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before } from "node:test";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { forget } from "../src/live.js";
import { setStore } from "../src/store/index.js";
import type { Service, StatusStore, Tenant } from "../src/types.js";

const tenant: Tenant = {
  id: "itc", name: "Islamic Tech Collective", hosts: ["status.example.org"],
  brand: { tagline: "", supportUrl: "", accent: "#0f766e", logoUrl: "" },
  adminTokenHash: "b".repeat(64), createdAt: new Date("2026-01-01T00:00:00Z"),
};

const service: Service = {
  id: "s1", tenantId: "itc", name: "Contributor Portal", description: "Accounts and claims.",
  group: "Houses", order: 0, listed: true, createdAt: new Date(),
  check: { kind: "http", url: "https://internal.example.net/health?token=SECRET", method: "GET", expectStatus: [200], timeoutMs: 5000, degradedMs: 2000 },
};

/** A store that can be told to start failing, the way a database does. */
let failing = false;
const boom = () => { throw new Error("connection refused"); };
const store = {
  kind: "fake",
  async close() {},
  async getTenant(id: string) { if (failing) boom(); return id === "itc" ? tenant : null; },
  async getTenantByHost(h: string) { if (failing) boom(); return tenant.hosts.includes(h) ? tenant : null; },
  async listTenants() { if (failing) boom(); return [tenant]; },
  async listServices() { if (failing) boom(); return [service]; },
  async listAllServices() { if (failing) boom(); return [service]; },
  async latestResults() {
    if (failing) boom();
    return { s1: { serviceId: "s1", tenantId: "itc", at: new Date(), state: "up" as const, ms: 120, status: 200 } };
  },
  async buckets() { if (failing) boom(); return []; },
  async listIncidents() { if (failing) boom(); return []; },
} as unknown as StatusStore;

let base = "";
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;

before(async () => {
  setStore(store);
  const config = { ...loadConfig({ PORT: "0", API_LOG: "off" } as NodeJS.ProcessEnv), rootTenant: "" };
  server = createApp(config, { stop() {}, async runAll() { return { checked: 0, down: 0 }; } }).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
  setStore(null);
});

/**
 * node:http rather than fetch: fetch treats Host as a forbidden header and silently replaces it
 * with the socket address, which would quietly test nothing — every request would arrive as
 * 127.0.0.1 and resolve to no tenant at all.
 */
function get(path: string, host = "status.example.org"): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; text: string }> {
  return new Promise((resolve, reject) => {
    const req = request(`${base}${path}`, { headers: { host } }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, text: body }));
    });
    req.on("error", reject);
    req.end();
  });
}

test("a healthy request renders the page for the host's tenant", async () => {
  failing = false;
  forget();
  const res = await get("/");
  assert.equal(res.status, 200);
  assert.match(res.text, /Islamic Tech Collective/);
  assert.match(res.text, /All systems operational/);
  assert.equal(res.text.includes("SECRET"), false, "the check URL must not reach the page either");
});

test("when the database fails, the page still renders and says the readings may be stale", async () => {
  failing = false;
  forget();
  await get("/"); // warm the cache the way real traffic would

  failing = true;
  const res = await get("/");
  assert.equal(res.status, 200, "a database outage must not take the status page down with it");
  assert.match(res.text, /Islamic Tech Collective/, "the tenant is still resolved, from memory");
  assert.match(res.text, /last known state/, "and the reader is told the readings may be out of date");
  assert.match(res.text, /Contributor Portal/);
});

test("the JSON feed degrades the same way, and marks itself stale", async () => {
  failing = false;
  forget();
  await get("/v1/status/itc");

  failing = true;
  const res = await get("/v1/status/itc");
  assert.equal(res.status, 200);
  const body = JSON.parse(res.text) as { stale?: boolean; services: unknown[] };
  assert.equal(body.stale, true);
  assert.equal(body.services.length, 1);
});

test("the badge still draws when the database is down", async () => {
  failing = false;
  forget();
  await get("/v1/status/itc/badge.svg");

  failing = true;
  const res = await get("/v1/status/itc/badge.svg");
  assert.equal(res.status, 200);
  assert.match(String(res.headers["content-type"] ?? ""), /svg/);
});

test("a cold process with no database and nothing remembered says so plainly", async () => {
  failing = true;
  forget();
  const res = await get("/");
  assert.equal(res.status, 404, "with no data and no memory, there is genuinely nothing to show");
  assert.match(res.text, /No status page here/);
});

test("an unknown host is not served another tenant's page", async () => {
  failing = false;
  forget();
  const res = await get("/", "status.somebody-else.com");
  assert.equal(res.status, 404);
});

test("health reports the database honestly rather than always 200", async () => {
  failing = true;
  const bad = await get("/health");
  assert.equal(bad.status, 503);
  assert.equal((JSON.parse(bad.text) as { database: boolean }).database, false);

  failing = false;
  const good = await get("/health");
  assert.equal(good.status, 200);
  assert.equal((JSON.parse(good.text) as { database: boolean }).database, true);
});
