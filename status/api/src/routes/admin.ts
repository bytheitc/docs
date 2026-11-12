// Managing a status page. Every route here is scoped to one tenant by its own token: a tenant's
// admin can never read or change another tenant's services, which is what makes one deployment
// safe to share between domains.
import { randomUUID } from "node:crypto";
import { Router, type Request } from "express";
import type { Config } from "../config.js";
import { defaultCheck } from "../checks.js";
import { HttpError, badRequest, body, notFound, str, unauthorized } from "../http.js";
import type { Scheduler } from "../scheduler.js";
import { getStore } from "../store/index.js";
import type { Check, Incident, IncidentStatus, Impact, Service, Tenant } from "../types.js";
import { httpUrl, isSlug, newToken, normaliseHost, safeColour, sha256, tokenMatches } from "../util.js";

const STATUSES: IncidentStatus[] = ["investigating", "identified", "monitoring", "resolved"];
const IMPACTS: Impact[] = ["minor", "major", "critical", "maintenance"];

const bearer = (req: Request): string => {
  const h = String(req.headers.authorization ?? "");
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
};

export function adminRoutes(config: Config, scheduler: Scheduler): Router {
  const r = Router();

  const store = () => {
    const s = getStore();
    if (!s) throw new HttpError(503, "unavailable", "The status service has no database configured.");
    return s;
  };

  /** Resolves the caller's tenant from their bearer token. */
  async function caller(req: Request): Promise<Tenant> {
    const token = bearer(req);
    if (!token) throw unauthorized("A tenant token is required.");
    for (const t of await store().listTenants()) {
      if (!t.disabled && tokenMatches(token, t.adminTokenHash)) return t;
    }
    throw unauthorized("That token is not valid.");
  }

  /** Throws unless this service belongs to the calling tenant. */
  async function ownService(req: Request, tenant: Tenant): Promise<Service> {
    const s = await store().getService(String(req.params.id));
    // Same answer whether it belongs to someone else or does not exist: a 403 would confirm it.
    if (!s || s.tenantId !== tenant.id) throw notFound("No such service.");
    return s;
  }

  function readCheck(b: Record<string, unknown>, existing?: Check): Check {
    const raw = (b.check ?? {}) as Record<string, unknown>;
    const url = httpUrl(str(raw, "url", { max: 500 }) || existing?.url || "");
    if (!url) throw badRequest("A check needs an http(s) URL.", { "check.url": "Must be an absolute http or https URL." });
    const expect = Array.isArray(raw.expectStatus)
      ? (raw.expectStatus as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n >= 100 && n < 600)
      : existing?.expectStatus ?? [200];
    const assertRaw = raw.assert as { path?: unknown; equals?: unknown } | undefined;
    return {
      kind: "http",
      url,
      method: (str(raw, "method", { max: 10 }) || existing?.method || "GET").toUpperCase(),
      expectStatus: expect.length ? expect : [200],
      timeoutMs: Math.min(30_000, Math.max(1000, Number(raw.timeoutMs) || existing?.timeoutMs || 10_000)),
      degradedMs: Math.max(0, Number(raw.degradedMs ?? existing?.degradedMs ?? 2000)),
      ...(raw.headers && typeof raw.headers === "object"
        ? { headers: Object.fromEntries(Object.entries(raw.headers as Record<string, string>).slice(0, 10).map(([k, v]) => [k, String(v).slice(0, 500)])) }
        : existing?.headers ? { headers: existing.headers } : {}),
      ...(assertRaw && typeof assertRaw.path === "string"
        ? { assert: { path: assertRaw.path.slice(0, 100), equals: assertRaw.equals } }
        : existing?.assert ? { assert: existing.assert } : {}),
    };
  }

  /* ---------------- first run ---------------- */

  // Creating the first tenant needs the setup token, which exists only while bootstrapping.
  r.post("/v1/admin/tenants", async (req, res) => {
    if (!config.setupToken) throw notFound("Tenant creation is closed on this deployment.");
    if (bearer(req) !== config.setupToken) throw unauthorized("The setup token is not valid.");
    const b = body(req);
    const id = str(b, "id", { required: true, max: 40 }).toLowerCase();
    if (!isSlug(id)) throw badRequest("The id must be a slug.", { id: "Lowercase letters, numbers and hyphens." });
    if (await store().getTenant(id)) throw badRequest("A tenant with that id already exists.", { id: "Already taken." });

    const hosts = (Array.isArray(b.hosts) ? (b.hosts as unknown[]) : []).map((h) => normaliseHost(String(h))).filter(Boolean).slice(0, 10);
    const token = newToken();
    const tenant: Tenant = {
      id,
      name: str(b, "name", { required: true, max: 80 }),
      hosts,
      brand: {
        tagline: str(b, "tagline", { max: 120 }),
        supportUrl: httpUrl(str(b, "supportUrl", { max: 300 })) ?? "",
        accent: safeColour(str(b, "accent", { max: 24 })),
        logoUrl: httpUrl(str(b, "logoUrl", { max: 300 })) ?? "",
      },
      adminTokenHash: sha256(token),
      createdAt: new Date(),
    };
    await store().addTenant(tenant);
    // The only time the token is ever readable. It is stored as a digest.
    res.status(201).json({ ok: true, tenant: { id: tenant.id, name: tenant.name, hosts }, token });
  });

  /* ---------------- this tenant ---------------- */

  r.get("/v1/admin/me", async (req, res) => {
    const t = await caller(req);
    const services = await store().listServices(t.id);
    res.json({
      tenant: { id: t.id, name: t.name, hosts: t.hosts, brand: t.brand },
      services: services.map((s) => ({ ...s, check: { ...s.check, headers: s.check.headers ? Object.keys(s.check.headers) : undefined } })),
    });
  });

  r.patch("/v1/admin/tenant", async (req, res) => {
    const t = await caller(req);
    const b = body(req);
    const patch: Partial<Tenant> = {};
    if (typeof b.name === "string") patch.name = str(b, "name", { required: true, max: 80 });
    if (Array.isArray(b.hosts)) patch.hosts = (b.hosts as unknown[]).map((h) => normaliseHost(String(h))).filter(Boolean).slice(0, 10);
    if (b.brand && typeof b.brand === "object") {
      const br = b.brand as Record<string, unknown>;
      patch.brand = {
        tagline: str(br, "tagline", { max: 120 }) || t.brand.tagline,
        supportUrl: httpUrl(str(br, "supportUrl", { max: 300 })) ?? t.brand.supportUrl,
        accent: safeColour(str(br, "accent", { max: 24 }) || t.brand.accent),
        logoUrl: httpUrl(str(br, "logoUrl", { max: 300 })) ?? t.brand.logoUrl,
      };
    }
    await store().updateTenant(t.id, patch);
    res.json({ ok: true });
  });

  /* ---------------- services ---------------- */

  r.post("/v1/admin/services", async (req, res) => {
    const t = await caller(req);
    const b = body(req);
    const name = str(b, "name", { required: true, max: 80 });
    const service: Service = {
      id: randomUUID(),
      tenantId: t.id,
      name,
      description: str(b, "description", { max: 200 }),
      group: str(b, "group", { max: 60 }) || "Services",
      order: Number(b.order) || (await store().listServices(t.id)).length,
      check: readCheck(b, defaultCheck("")),
      listed: b.listed !== false,
      createdAt: new Date(),
    };
    await store().addService(service);
    res.status(201).json({ ok: true, service });
  });

  r.patch("/v1/admin/services/:id", async (req, res) => {
    const t = await caller(req);
    const existing = await ownService(req, t);
    const b = body(req);
    const patch: Partial<Service> = {};
    if (typeof b.name === "string") patch.name = str(b, "name", { required: true, max: 80 });
    if (typeof b.description === "string") patch.description = str(b, "description", { max: 200 });
    if (typeof b.group === "string") patch.group = str(b, "group", { max: 60 });
    if (b.order !== undefined) patch.order = Number(b.order) || 0;
    if (b.listed !== undefined) patch.listed = b.listed !== false;
    if (b.check) patch.check = readCheck(b, existing.check);
    await store().updateService(existing.id, patch);
    res.json({ ok: true });
  });

  r.delete("/v1/admin/services/:id", async (req, res) => {
    const t = await caller(req);
    const s = await ownService(req, t);
    await store().deleteService(s.id);
    res.json({ ok: true });
  });

  /* ---------------- incidents ---------------- */

  r.post("/v1/admin/incidents", async (req, res) => {
    const t = await caller(req);
    const b = body(req);
    const impact = str(b, "impact", { max: 20 }) as Impact;
    if (!IMPACTS.includes(impact)) throw badRequest(`Impact must be one of ${IMPACTS.join(", ")}.`, { impact: "Unknown impact." });
    const status = (str(b, "status", { max: 20 }) || "investigating") as IncidentStatus;
    if (!STATUSES.includes(status)) throw badRequest(`Status must be one of ${STATUSES.join(", ")}.`, { status: "Unknown status." });

    const mine = new Set((await store().listServices(t.id)).map((s) => s.id));
    const serviceIds = (Array.isArray(b.serviceIds) ? (b.serviceIds as unknown[]) : [])
      .map(String).filter((id) => mine.has(id)).slice(0, 50);

    const now = new Date();
    const startedAt = b.startedAt ? new Date(String(b.startedAt)) : now;
    if (Number.isNaN(startedAt.getTime())) throw badRequest("startedAt is not a date.", { startedAt: "Use an ISO date." });

    const incident: Incident = {
      id: randomUUID(),
      tenantId: t.id,
      title: str(b, "title", { required: true, max: 140 }),
      impact,
      status,
      serviceIds,
      startedAt,
      updates: [{ at: now, status, body: str(b, "body", { required: true, max: 4000 }) }],
      ...(impact === "maintenance" ? { scheduled: true } : {}),
    };
    await store().addIncident(incident);
    res.status(201).json({ ok: true, incident });
  });

  r.post("/v1/admin/incidents/:id/updates", async (req, res) => {
    const t = await caller(req);
    const incident = await store().getIncident(String(req.params.id));
    if (!incident || incident.tenantId !== t.id) throw notFound("No such incident.");
    const b = body(req);
    const status = (str(b, "status", { max: 20 }) || incident.status) as IncidentStatus;
    if (!STATUSES.includes(status)) throw badRequest(`Status must be one of ${STATUSES.join(", ")}.`, { status: "Unknown status." });

    const now = new Date();
    await store().updateIncident(incident.id, {
      status,
      updates: [...incident.updates, { at: now, status, body: str(b, "body", { required: true, max: 4000 }) }],
      // Resolving is the one status change that also closes the clock.
      ...(status === "resolved" ? { resolvedAt: now } : { resolvedAt: undefined }),
    });
    res.json({ ok: true });
  });

  r.get("/v1/admin/incidents", async (req, res) => {
    const t = await caller(req);
    res.json({ incidents: await store().listIncidents(t.id, { limit: 100 }) });
  });

  /* ---------------- run the checks now ---------------- */

  r.post("/v1/admin/run", async (req, res) => {
    await caller(req);
    res.json({ ok: true, ...(await scheduler.runAll()) });
  });

  return r;
}
