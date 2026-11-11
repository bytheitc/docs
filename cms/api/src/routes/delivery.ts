// Delivery API: called by house apis with their space key. Everything here is scoped to the key's space.
//   PUT  /v1/spaces/:space/schema                    register or update the space's schema; seeds empty collections
//   GET  /v1/spaces/:space/content/:collection       published entries, in editor order
//   GET  /v1/spaces/:space/content/:collection/:id   one published entry
//   POST /v1/spaces/:space/submissions               a public form submission (honeypot ones are dropped)
//   POST /v1/auth/introspect                         is this CMS session token a staff member of my space?
import express, { Router } from "express";
import { canAccess, publicUser, sha256, spaceKeyAuth, userForToken } from "../auth.js";
import { badRequest, body, invalid, notFound, str, unauthorized } from "../http.js";
import type { Ctx } from "../app.js";
import type { Entry, SpaceRecord } from "../types.js";
import { validateSchema } from "../validate.js";

const MAX_FORM_FIELDS = 30;
const MAX_FORM_VALUE = 5000;
const FORM_KEY = /^[a-zA-Z][a-zA-Z0-9_-]{0,40}$/;

export function deliveryRoutes({ config, store }: Ctx): Router {
  const r = Router();
  const keyAuth = spaceKeyAuth(config);

  // Schema registration gets a larger body limit than the rest of the api (seeds travel with it).
  // The key is checked before the body is read.
  r.put("/v1/spaces/:space/schema", keyAuth, express.json({ limit: "8mb" }), async (req, res) => {
    const spaceId = req.params.space as string;
    const { schema, errors } = validateSchema(req.body);
    if (!schema) throw invalid(errors, "The schema is not valid.");

    const now = new Date();
    const hash = sha256(JSON.stringify(schema));
    const existing = await store.getSpace(spaceId);
    const changed = !existing || existing.hash !== hash;
    const record: SpaceRecord = {
      id: spaceId,
      label: schema.label,
      title: schema.title,
      collections: schema.collections.map(({ seed, ...def }) => { void seed; return def; }),
      forms: schema.forms,
      links: schema.links,
      webhook: schema.webhook,
      hash,
      seeded: { ...(existing?.seeded ?? {}) },
      createdAt: existing?.createdAt ?? now,
      updatedAt: changed ? now : existing!.updatedAt,
    };

    // Seed each collection once, and only while it is empty. A collection an editor has emptied on purpose
    // is not refilled on the next boot.
    const seeded: string[] = [];
    for (const c of schema.collections) {
      if (!c.seed?.length || record.seeded[c.name]) continue;
      const entries: Entry[] = c.seed.map((data, position) => ({
        space: spaceId, collection: c.name, id: String(data[c.idField]).trim(), status: "published", position, data,
        createdAt: now, updatedAt: now, updatedBy: null, pending: null,
      }));
      if (await store.seedIfEmpty(spaceId, c.name, entries)) seeded.push(c.name);
      record.seeded[c.name] = now;
    }
    await store.putSpace(record);

    if (changed || seeded.length) {
      await store.addAudit({
        at: now, space: spaceId, actor: `key:${spaceId}`, action: existing ? (changed ? "space.update" : "space.seed") : "space.register",
        target: spaceId, detail: seeded.length ? `seeded ${seeded.join(", ")}` : undefined,
      });
    }
    res.json({
      space: { id: record.id, label: record.label, title: record.title, collections: record.collections.map((c) => c.name), forms: Object.keys(record.forms) },
      changed,
      seeded,
    });
  });

  const loadSpace = async (id: string) => {
    const space = await store.getSpace(id);
    if (!space) throw notFound(`Space "${id}" has not registered a schema yet.`);
    return space;
  };
  const loadCollection = (space: SpaceRecord, name: string) => {
    const def = space.collections.find((c) => c.name === name);
    if (!def) throw notFound(`Space "${space.id}" has no collection "${name}".`);
    return def;
  };

  r.get("/v1/spaces/:space/content/:collection", keyAuth, async (req, res) => {
    const space = await loadSpace(req.params.space as string);
    const def = loadCollection(space, req.params.collection as string);
    const entries = await store.listEntries(space.id, def.name, { status: ["published"] });
    res.json({ entries: entries.map((e) => e.data) });
  });

  r.get("/v1/spaces/:space/content/:collection/:id", keyAuth, async (req, res) => {
    const space = await loadSpace(req.params.space as string);
    const def = loadCollection(space, req.params.collection as string);
    const e = await store.getEntry(space.id, def.name, req.params.id as string);
    if (!e || e.status !== "published") throw notFound("No published entry with that id.");
    res.json({ entry: e.data });
  });

  r.post("/v1/spaces/:space/submissions", keyAuth, async (req, res) => {
    const b = body(req);
    // A visually hidden field people never fill in; bots often do. Accept silently and drop.
    if (b.honeypot != null && String(b.honeypot).trim() !== "") return void res.status(202).json({ ok: true });

    const space = await loadSpace(req.params.space as string);
    const form = str(b, "form", { required: true, max: 48 });
    if (!Object.hasOwn(space.forms, form)) throw badRequest(`Space "${space.id}" has no form "${form}".`, { form: "Unknown form." });
    const fields = b.fields;
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw badRequest('"fields" must be an object.', { fields: "Must be an object." });

    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields as Record<string, unknown>).slice(0, MAX_FORM_FIELDS)) {
      if (!FORM_KEY.test(k)) continue;
      const val = (typeof v === "string" ? v : v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)).trim().slice(0, MAX_FORM_VALUE);
      if (val) data[k] = val;
    }
    if (!Object.keys(data).length) throw invalid({ fields: "The submission is empty." }, "The submission is empty.");

    const now = new Date();
    await store.addSubmission({ space: space.id, id: crypto.randomUUID(), form, data, status: "new", createdAt: now, updatedAt: now });
    res.status(202).json({ ok: true });
  });

  r.post("/v1/auth/introspect", keyAuth, async (req, res) => {
    const token = str(body(req), "token", { max: 200 });
    const found = token ? await userForToken(store, token) : null;
    if (!found || !canAccess(found.user, req.keySpace!)) throw unauthorized("That session is not valid for this space.");
    res.json({ user: publicUser(found.user) });
  });

  return r;
}
