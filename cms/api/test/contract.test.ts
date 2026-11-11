// HTTP-level contract tests for cms/api (ARCHITECTURE.md, "CMS API contract (v1)").
// Runs real servers on spare ports against a throwaway MongoDB:
//   TEST_MONGODB_URI   default mongodb://127.0.0.1:27099
//   TEST_DB_NAME       default itc_cms_test (dropped before the run)
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import { MongoClient } from "mongodb";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createStorage } from "../src/storage.js";
import type { StorageAdapter } from "../src/types.js";

const MONGO = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27099";
const DB = process.env.TEST_DB_NAME ?? "itc_cms_test";
const RESEARCH_KEY = "research-key-0123456789abcdef";
const AI_PROD_KEY = "ai-production-key-0123456789";
const SETUP_TOKEN = "setup-token-for-tests-123";
const PW = { admin: "correct horse battery", editor: "editor password 123", pub: "publisher password 1" };

type Res = { status: number; json: any; headers: Headers };
async function call(base: string, method: string, path: string, opts: { token?: string; body?: unknown; raw?: string } = {}): Promise<Res> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined || opts.raw !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(base + path, { method, headers, body: opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)) });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json, headers: res.headers };
}

const servers: Server[] = [];
const stores: StorageAdapter[] = [];
function start(env: Record<string, string>): Promise<string> {
  const config = loadConfig({ MONGODB_URI: MONGO, CMS_DB_NAME: DB, CMS_LOG: "off", CMS_LOGIN_LIMIT: "200", ...env });
  const store = createStorage(config);
  stores.push(store);
  const server = createApp({ config, store }).listen(0);
  servers.push(server);
  return new Promise((r) => server.once("listening", () => r(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)));
}

// A webhook receiver that records what it is sent.
const hooks: { body: string; signature: string }[] = [];
let hookUrl = "";
async function waitForHook(pred: (b: any) => boolean, ms = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const h = hooks.find((x) => pred(JSON.parse(x.body)));
    if (h) return h;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

const aiSchema = () => ({
  label: "AI",
  title: "AI Studio",
  forms: { interest: "Register interest" },
  links: [{ href: "https://example.org/tools", label: "Tools", role: "publisher" }],
  webhook: { url: hookUrl },
  collections: [
    {
      name: "projects", label: "Projects", singular: "Project", idField: "slug", titleField: "title", columns: ["kind"],
      fields: [
        { type: "text", name: "slug", label: "Slug", required: true },
        { type: "text", name: "title", label: "Title", required: true },
        { type: "select", name: "kind", label: "Kind", required: true, options: ["model", "tool"] },
        { type: "text", name: "modelCard", label: "Model card", required: true, showWhen: { field: "kind", equals: "model" } },
        { type: "list", name: "people", label: "People", itemTitle: "name", fields: [{ type: "text", name: "name", label: "Name", required: true }] },
        { type: "relation", name: "related", label: "Related", collection: "projects", multiple: true },
      ],
      seed: [
        { slug: "alpha", title: "Alpha", kind: "tool" },
        { slug: "beta", title: "Beta", kind: "model", modelCard: "/cards/beta" },
      ],
    },
    {
      name: "settings", label: "Settings", singular: "Settings", idField: "id", titleField: "id", singleton: true,
      fields: [{ type: "text", name: "id", label: "Id", required: true }, { type: "boolean", name: "open", label: "Open" }],
      seed: [{ id: "settings", open: true }],
    },
  ],
});
const researchSchema = () => ({
  label: "Research",
  title: "Research Studio",
  forms: {},
  collections: [
    {
      name: "notes", label: "Notes", singular: "Note", idField: "slug", titleField: "title",
      fields: [{ type: "text", name: "slug", label: "Slug", required: true }, { type: "text", name: "title", label: "Title", required: true }],
      seed: [{ slug: "first-note", title: "First note" }],
    },
  ],
});

let DEV = "", PROD = "", LIMITED = "";
let adminToken = "", editorToken = "", pubToken = "", editorId = "";

before(async () => {
  const m = await new MongoClient(MONGO).connect();
  await m.db(DB).dropDatabase();
  await m.close();
  const hookServer = createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => { hooks.push({ body: b, signature: String(req.headers["x-cms-signature"] ?? "") }); res.end("ok"); });
  }).listen(0);
  servers.push(hookServer);
  await new Promise((r) => hookServer.once("listening", r));
  hookUrl = `http://127.0.0.1:${(hookServer.address() as AddressInfo).port}/cms/webhook`;

  // Development: research has a configured key; ai uses its dev key.
  DEV = await start({ NODE_ENV: "development", CMS_SPACE_KEYS: `research:${RESEARCH_KEY}` });
  // Production: both configured; dev keys must be refused.
  PROD = await start({ NODE_ENV: "production", CMS_SPACE_KEYS: `research:${RESEARCH_KEY},ai:${AI_PROD_KEY}`, CMS_SETUP_TOKEN: SETUP_TOKEN });
  // A strict sign-in rate limit, to check it.
  LIMITED = await start({ NODE_ENV: "development", CMS_LOGIN_LIMIT: "3" });
});

after(async () => {
  await new Promise((r) => setTimeout(r, 300)); // let fire-and-forget webhook audits land
  for (const s of servers) { s.closeAllConnections?.(); s.close(); }
  await Promise.all(stores.map((s) => s.close()));
});

describe("basics", () => {
  test("health reports the database", async () => {
    const r = await call(DEV, "GET", "/health");
    assert.equal(r.status, 200);
    assert.equal(r.json.database.reachable, true);
    assert.equal(r.headers.get("x-powered-by"), null);
  });
  test("errors share one shape", async () => {
    const r = await call(DEV, "GET", "/v1/nope");
    assert.equal(r.status, 404);
    assert.equal(r.json.error.code, "not_found");
    assert.equal(typeof r.json.error.message, "string");
    const bad = await call(DEV, "POST", "/v1/auth/login", { raw: "{not json" });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error.code, "bad_request");
  });
  test("bodies are size-limited", async () => {
    const r = await call(DEV, "POST", "/v1/auth/login", { raw: JSON.stringify({ email: "x".repeat(300_000) }) });
    assert.equal(r.status, 413);
    assert.equal(r.json.error.code, "payload_too_large");
  });
});

describe("schema registration and seeding", () => {
  test("requires a space key", async () => {
    const r = await call(DEV, "PUT", "/v1/spaces/ai/schema", { body: aiSchema() });
    assert.equal(r.status, 401);
  });
  test("rejects an invalid schema with readable messages", async () => {
    const bad = {
      label: "AI",
      collections: [
        {
          name: "things", label: "Things", idField: "missing",
          fields: [
            { type: "text", name: "a", label: "A" },
            { type: "text", name: "a", label: "A again" },
            { type: "wibble", name: "b", label: "B" },
            { type: "relation", name: "r", label: "R", collection: "nowhere" },
            { type: "select", name: "s", label: "S" },
            { type: "text", name: "w", label: "W", showWhen: { field: "ghost", equals: "x" } },
          ],
        },
      ],
    };
    const r = await call(DEV, "PUT", "/v1/spaces/ai/schema", { token: "dev-ai-key", body: bad });
    assert.equal(r.status, 400);
    assert.equal(r.json.error.code, "validation_failed");
    const f = r.json.error.fields;
    assert.match(f["collections[0].idField"], /not one of this collection's top-level fields/);
    assert.match(f["collections[0].fields[1].name"], /defined twice/);
    assert.match(f["collections[0].fields[2].type"], /type must be one of/);
    assert.match(f["collections[0].fields[3].collection"], /relation must point at a collection/);
    assert.match(f["collections[0].fields[4].options"], /options/);
    assert.match(f["collections[0].fields[5].showWhen"], /not a sibling/);
  });
  test("registers spaces and seeds empty collections", async () => {
    const ai = await call(DEV, "PUT", "/v1/spaces/ai/schema", { token: "dev-ai-key", body: aiSchema() });
    assert.equal(ai.status, 200, JSON.stringify(ai.json));
    assert.deepEqual(ai.json.seeded.sort(), ["projects", "settings"]);
    const rs = await call(DEV, "PUT", "/v1/spaces/research/schema", { token: RESEARCH_KEY, body: researchSchema() });
    assert.equal(rs.status, 200);
    assert.deepEqual(rs.json.seeded, ["notes"]);
  });
  test("re-registering is idempotent and never re-seeds", async () => {
    const again = await call(DEV, "PUT", "/v1/spaces/ai/schema", { token: "dev-ai-key", body: aiSchema() });
    assert.equal(again.status, 200);
    assert.equal(again.json.changed, false);
    assert.deepEqual(again.json.seeded, []);
    const list = await call(DEV, "GET", "/v1/spaces/ai/content/projects", { token: "dev-ai-key" });
    assert.equal(list.json.entries.length, 2);
  });
});

describe("delivery", () => {
  test("returns published entries in order, and single entries", async () => {
    const list = await call(DEV, "GET", "/v1/spaces/ai/content/projects", { token: "dev-ai-key" });
    assert.equal(list.status, 200);
    assert.deepEqual(list.json.entries.map((e: any) => e.slug), ["alpha", "beta"]);
    const one = await call(DEV, "GET", "/v1/spaces/ai/content/projects/beta", { token: "dev-ai-key" });
    assert.equal(one.json.entry.title, "Beta");
    const none = await call(DEV, "GET", "/v1/spaces/ai/content/projects/zzz", { token: "dev-ai-key" });
    assert.equal(none.status, 404);
    const noColl = await call(DEV, "GET", "/v1/spaces/ai/content/nope", { token: "dev-ai-key" });
    assert.equal(noColl.status, 404);
  });
  test("a key for ai cannot read research", async () => {
    const r = await call(DEV, "GET", "/v1/spaces/research/content/notes", { token: "dev-ai-key" });
    assert.equal(r.status, 403);
    assert.equal(r.json.error.code, "forbidden");
  });
  test("a dev key is refused when the space has a configured key", async () => {
    const r = await call(DEV, "GET", "/v1/spaces/research/content/notes", { token: "dev-research-key" });
    assert.equal(r.status, 401);
    const ok = await call(DEV, "GET", "/v1/spaces/research/content/notes", { token: RESEARCH_KEY });
    assert.equal(ok.status, 200);
  });
  test("dev keys are rejected when NODE_ENV=production", async () => {
    const r = await call(PROD, "GET", "/v1/spaces/ai/content/projects", { token: "dev-ai-key" });
    assert.equal(r.status, 401);
    const unknown = await call(PROD, "GET", "/v1/spaces/oss/content/x", { token: "dev-oss-key" });
    assert.equal(unknown.status, 401);
    const ok = await call(PROD, "GET", "/v1/spaces/ai/content/projects", { token: AI_PROD_KEY });
    assert.equal(ok.status, 200);
  });
});

describe("user sessions", () => {
  test("status says setup is needed", async () => {
    const r = await call(PROD, "GET", "/v1/auth/status");
    assert.deepEqual(r.json, { setupNeeded: true, setupTokenRequired: true });
  });
  test("first-admin setup needs the setup token in production", async () => {
    const body = { name: "Ada Admin", email: "Admin@Example.org", password: PW.admin };
    const wrong = await call(PROD, "POST", "/v1/auth/setup", { body: { ...body, token: "nope" } });
    assert.equal(wrong.status, 403);
    const weak = await call(PROD, "POST", "/v1/auth/setup", { body: { ...body, password: "short", token: SETUP_TOKEN } });
    assert.equal(weak.status, 400);
    assert.ok(weak.json.error.fields.password);
    const ok = await call(PROD, "POST", "/v1/auth/setup", { body: { ...body, token: SETUP_TOKEN } });
    assert.equal(ok.status, 201);
    assert.equal(ok.json.user.email, "admin@example.org");
    assert.equal(ok.json.user.role, "admin");
    assert.equal(ok.json.user.spaces, "*");
    assert.ok(!JSON.stringify(ok.json).includes("scrypt$"));
    assert.ok(!("passwordHash" in ok.json.user));
    adminToken = ok.json.token;
    const again = await call(DEV, "POST", "/v1/auth/setup", { body });
    assert.equal(again.status, 409);
  });
  test("login, me, logout", async () => {
    const bad = await call(DEV, "POST", "/v1/auth/login", { body: { email: "admin@example.org", password: "wrong password!!" } });
    assert.equal(bad.status, 401);
    const nobody = await call(DEV, "POST", "/v1/auth/login", { body: { email: "nobody@example.org", password: "wrong password!!" } });
    assert.equal(nobody.status, 401);
    assert.equal(nobody.json.error.message, bad.json.error.message);
    const ok = await call(DEV, "POST", "/v1/auth/login", { body: { email: "ADMIN@example.org", password: PW.admin } });
    assert.equal(ok.status, 200);
    const t = ok.json.token;
    assert.equal((await call(DEV, "GET", "/v1/auth/me", { token: t })).json.user.email, "admin@example.org");
    assert.equal((await call(DEV, "POST", "/v1/auth/logout", { token: t })).status, 204);
    assert.equal((await call(DEV, "GET", "/v1/auth/me", { token: t })).status, 401);
    assert.equal((await call(DEV, "GET", "/v1/auth/me")).status, 401);
  });
  test("sign-in is rate-limited", async () => {
    const tries = [];
    for (let i = 0; i < 4; i++) tries.push((await call(LIMITED, "POST", "/v1/auth/login", { body: { email: "x@example.org", password: "whatever-whatever" } })).status);
    assert.deepEqual(tries, [401, 401, 401, 429]);
  });
  test("admins create accounts with a role and spaces; hashes never leak", async () => {
    const ed = await call(DEV, "POST", "/v1/users", { token: adminToken, body: { name: "Eda Editor", email: "editor@example.org", role: "editor", spaces: ["ai"], password: PW.editor } });
    assert.equal(ed.status, 201, JSON.stringify(ed.json));
    assert.deepEqual(ed.json.user.spaces, ["ai"]);
    editorId = ed.json.user.id;
    const pub = await call(DEV, "POST", "/v1/users", { token: adminToken, body: { name: "Pat Publisher", email: "pub@example.org", role: "publisher", spaces: "*", password: PW.pub } });
    assert.equal(pub.status, 201);
    const dup = await call(DEV, "POST", "/v1/users", { token: adminToken, body: { name: "X", email: "pub@example.org", role: "editor", spaces: [], password: PW.pub } });
    assert.equal(dup.status, 400);
    assert.ok(dup.json.error.fields.email);
    const list = await call(DEV, "GET", "/v1/users", { token: adminToken });
    assert.equal(list.json.users.length, 3);
    assert.ok(!JSON.stringify(list.json).includes("passwordHash"));
    assert.ok(!JSON.stringify(list.json).includes("scrypt$"));
    editorToken = (await call(DEV, "POST", "/v1/auth/login", { body: { email: "editor@example.org", password: PW.editor } })).json.token;
    pubToken = (await call(DEV, "POST", "/v1/auth/login", { body: { email: "pub@example.org", password: PW.pub } })).json.token;
    assert.ok(editorToken && pubToken);
    const denied = await call(DEV, "GET", "/v1/users", { token: editorToken });
    assert.equal(denied.status, 403);
  });
});

const E = "/v1/spaces/ai/collections/projects/entries";

describe("workflow", () => {
  test("space overview lists collections, counts and role-filtered links", async () => {
    const r = await call(DEV, "GET", "/v1/spaces/ai", { token: pubToken });
    assert.equal(r.status, 200);
    assert.equal(r.json.space.title, "AI Studio");
    assert.deepEqual(r.json.counts.projects, { total: 2, published: 2 });
    assert.equal(r.json.space.links.length, 1);
    const ed = await call(DEV, "GET", "/v1/spaces/ai", { token: editorToken });
    assert.equal(ed.json.space.links.length, 0);
  });
  test("an edit to a live entry is held as pending; delivery keeps the old version", async () => {
    const r = await call(DEV, "PUT", `${E}/alpha`, { token: editorToken, body: { intent: "save", data: { slug: "alpha", title: "Alpha (revised)", kind: "tool" } } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.held, true);
    assert.equal(r.json.entry.status, "published");
    assert.equal(r.json.entry.pending.data.title, "Alpha (revised)");
    const live = await call(DEV, "GET", "/v1/spaces/ai/content/projects/alpha", { token: "dev-ai-key" });
    assert.equal(live.json.entry.title, "Alpha");
    const ov = await call(DEV, "GET", "/v1/spaces/ai", { token: editorToken });
    assert.ok(ov.json.review.some((x: any) => x.id === "alpha" && x.pending));
  });
  test("an editor can't publish", async () => {
    const st = await call(DEV, "POST", `${E}/alpha/status`, { token: editorToken, body: { to: "publish-pending" } });
    assert.equal(st.status, 403);
    const put = await call(DEV, "PUT", `${E}/alpha`, { token: editorToken, body: { intent: "publish", data: { slug: "alpha", title: "x", kind: "tool" } } });
    assert.equal(put.status, 403);
    const create = await call(DEV, "POST", E, { token: editorToken, body: { intent: "publish", data: { slug: "gamma", title: "Gamma", kind: "tool" } } });
    assert.equal(create.status, 403);
    const del = await call(DEV, "DELETE", `${E}/alpha`, { token: editorToken, body: { confirm: "alpha" } });
    assert.equal(del.status, 403);
    const mv = await call(DEV, "POST", `${E}/alpha/move`, { token: editorToken, body: { dir: "down" } });
    assert.equal(mv.status, 403);
  });
  test("publishing the pending changes updates delivery and fires a signed webhook", async () => {
    hooks.length = 0;
    const r = await call(DEV, "POST", `${E}/alpha/status`, { token: pubToken, body: { to: "publish-pending" } });
    assert.equal(r.status, 200);
    assert.equal(r.json.entry.pending, null);
    const live = await call(DEV, "GET", "/v1/spaces/ai/content/projects/alpha", { token: "dev-ai-key" });
    assert.equal(live.json.entry.title, "Alpha (revised)");
    const hook = await waitForHook((b) => b.id === "alpha");
    assert.ok(hook, "webhook received");
    assert.deepEqual(JSON.parse(hook!.body), { space: "ai", collection: "projects", id: "alpha", event: "update" });
    const expected = `sha256=${createHmac("sha256", "dev-ai-key").update(hook!.body).digest("hex")}`;
    assert.equal(hook!.signature, expected);
  });
  test("a draft is not delivered until published; unpublish removes it", async () => {
    const c = await call(DEV, "POST", E, { token: editorToken, body: { intent: "save", data: { slug: "gamma", title: "Gamma", kind: "tool", people: [{ name: "Noor" }] } } });
    assert.equal(c.status, 201, JSON.stringify(c.json));
    assert.equal(c.json.entry.status, "draft");
    assert.equal((await call(DEV, "GET", "/v1/spaces/ai/content/projects/gamma", { token: "dev-ai-key" })).status, 404);
    const sub = await call(DEV, "POST", `${E}/gamma/status`, { token: editorToken, body: { to: "review" } });
    assert.equal(sub.json.entry.status, "review");
    const pub = await call(DEV, "POST", `${E}/gamma/status`, { token: pubToken, body: { to: "published" } });
    assert.equal(pub.json.entry.status, "published");
    const live = await call(DEV, "GET", "/v1/spaces/ai/content/projects/gamma", { token: "dev-ai-key" });
    assert.deepEqual(live.json.entry.people, [{ name: "Noor" }]);
    const un = await call(DEV, "POST", `${E}/gamma/status`, { token: pubToken, body: { to: "draft" } });
    assert.equal(un.json.entry.status, "draft");
    assert.equal((await call(DEV, "GET", "/v1/spaces/ai/content/projects/gamma", { token: "dev-ai-key" })).status, 404);
    assert.ok(await waitForHook((b) => b.id === "gamma" && b.event === "unpublish"));
  });
  test("validation errors come back per field, honouring showWhen and the id rules", async () => {
    const bad = await call(DEV, "POST", E, { token: editorToken, body: { data: { slug: "Bad Slug!", kind: "model", people: [{}] } } });
    assert.equal(bad.status, 400);
    assert.equal(bad.json.error.code, "validation_failed");
    const f = bad.json.error.fields;
    assert.match(f.slug, /lowercase/);
    assert.match(f.title, /required/);
    assert.match(f.modelCard, /required/); // shown because kind = model
    assert.match(f["people[0].name"], /required/);
    // Hidden by showWhen: neither validated nor stored.
    const ok = await call(DEV, "POST", E, { token: editorToken, body: { data: { slug: "delta", title: "Delta", kind: "tool", modelCard: "ignored" } } });
    assert.equal(ok.status, 201);
    assert.equal(ok.json.entry.data.modelCard, undefined);
    const dup = await call(DEV, "POST", E, { token: editorToken, body: { data: { slug: "delta", title: "Delta 2", kind: "tool" } } });
    assert.equal(dup.status, 409);
    assert.ok(dup.json.error.fields.slug);
    const single = await call(DEV, "POST", "/v1/spaces/ai/collections/settings/entries", { token: pubToken, body: { data: { id: "second" } } });
    assert.equal(single.status, 409);
  });
  test("revisions and restore", async () => {
    await call(DEV, "PUT", `${E}/delta`, { token: editorToken, body: { data: { slug: "delta", title: "Delta v2", kind: "tool" } } });
    const revs = await call(DEV, "GET", `${E}/delta/revisions`, { token: editorToken });
    assert.equal(revs.status, 200);
    assert.equal(revs.json.revisions.length, 2);
    const first = revs.json.revisions[1];
    assert.equal(first.data.title, "Delta");
    const r = await call(DEV, "POST", `${E}/delta/restore`, { token: editorToken, body: { at: first.at } });
    assert.equal(r.status, 200);
    assert.equal(r.json.entry.data.title, "Delta");
    // On a live entry a restore is held as pending.
    const betaRevs = (await call(DEV, "GET", `${E}/alpha/revisions`, { token: editorToken })).json.revisions;
    const live = await call(DEV, "POST", `${E}/alpha/restore`, { token: editorToken, body: { at: betaRevs[betaRevs.length - 1].at } });
    assert.equal(live.json.held, true);
    assert.equal(live.json.entry.status, "published");
    assert.ok(live.json.entry.pending);
    await call(DEV, "POST", `${E}/alpha/status`, { token: pubToken, body: { to: "discard-pending" } });
    const unknownRev = await call(DEV, "POST", `${E}/delta/restore`, { token: editorToken, body: { at: new Date(0).toISOString() } });
    assert.equal(unknownRev.status, 404);
  });
  test("reordering changes delivery order", async () => {
    const mv = await call(DEV, "POST", `${E}/beta/move`, { token: pubToken, body: { dir: "up" } });
    assert.equal(mv.json.moved, true);
    const list = await call(DEV, "GET", "/v1/spaces/ai/content/projects", { token: "dev-ai-key" });
    assert.deepEqual(list.json.entries.map((e: any) => e.slug), ["beta", "alpha"]);
  });
  test("deleting needs the typed id", async () => {
    const wrong = await call(DEV, "DELETE", `${E}/delta`, { token: pubToken, body: { confirm: "nope" } });
    assert.equal(wrong.status, 400);
    assert.ok(wrong.json.error.fields.confirm);
    const ok = await call(DEV, "DELETE", `${E}/delta`, { token: pubToken, body: { confirm: "delta" } });
    assert.equal(ok.status, 204);
    assert.equal((await call(DEV, "GET", `${E}/delta`, { token: pubToken })).status, 404);
  });
});

describe("space restriction", () => {
  test("a user limited to ai sees only ai and can't open research", async () => {
    const list = await call(DEV, "GET", "/v1/spaces", { token: editorToken });
    assert.deepEqual(list.json.spaces.map((s: any) => s.id), ["ai"]);
    const all = await call(DEV, "GET", "/v1/spaces", { token: pubToken });
    assert.deepEqual(all.json.spaces.map((s: any) => s.id), ["ai", "research"]);
    assert.equal((await call(DEV, "GET", "/v1/spaces/research", { token: editorToken })).status, 403);
    assert.equal((await call(DEV, "GET", "/v1/spaces/research/collections/notes/entries", { token: editorToken })).status, 403);
    assert.equal((await call(DEV, "PUT", "/v1/spaces/research/collections/notes/entries/first-note", { token: editorToken, body: { data: { slug: "first-note", title: "x" } } })).status, 403);
    assert.equal((await call(DEV, "GET", "/v1/spaces/research/inbox", { token: editorToken })).status, 403);
    assert.equal((await call(DEV, "GET", "/v1/spaces/nowhere", { token: pubToken })).status, 404);
  });
  test("an admin can change a user's spaces; access follows immediately", async () => {
    const r = await call(DEV, "PATCH", `/v1/users/${editorId}`, { token: adminToken, body: { spaces: ["ai", "research"] } });
    assert.equal(r.status, 200);
    assert.equal((await call(DEV, "GET", "/v1/spaces/research", { token: editorToken })).status, 200);
    await call(DEV, "PATCH", `/v1/users/${editorId}`, { token: adminToken, body: { spaces: ["ai"] } });
    assert.equal((await call(DEV, "GET", "/v1/spaces/research", { token: editorToken })).status, 403);
    const self = await call(DEV, "PATCH", `/v1/users/${(await call(DEV, "GET", "/v1/auth/me", { token: adminToken })).json.user.id}`, { token: adminToken, body: { role: "editor" } });
    assert.equal(self.status, 403);
  });
});

describe("submissions and the inbox", () => {
  test("rejects unknown forms and empty submissions", async () => {
    const unknown = await call(DEV, "POST", "/v1/spaces/ai/submissions", { token: "dev-ai-key", body: { form: "nope", fields: { name: "x" } } });
    assert.equal(unknown.status, 400);
    const empty = await call(DEV, "POST", "/v1/spaces/ai/submissions", { token: "dev-ai-key", body: { form: "interest", fields: { "bad key!": "x", blank: "  " } } });
    assert.equal(empty.status, 400);
  });
  test("honeypot submissions are accepted and dropped; real ones reach the inbox", async () => {
    const trap = await call(DEV, "POST", "/v1/spaces/ai/submissions", { token: "dev-ai-key", body: { form: "interest", fields: { name: "Bot" }, honeypot: "http://spam" } });
    assert.equal(trap.status, 202);
    const real = await call(DEV, "POST", "/v1/spaces/ai/submissions", { token: "dev-ai-key", body: { form: "interest", fields: { name: "Amina", email: "amina@example.org", message: "Hello" } } });
    assert.equal(real.status, 202);
    const inbox = await call(DEV, "GET", "/v1/spaces/ai/inbox", { token: editorToken });
    assert.equal(inbox.json.submissions.length, 1);
    const s = inbox.json.submissions[0];
    assert.equal(s.data.name, "Amina");
    assert.equal(s.status, "new");
    const one = await call(DEV, "GET", `/v1/spaces/ai/inbox/${s.id}`, { token: editorToken });
    assert.equal(one.json.submission.data.message, "Hello");
    const patched = await call(DEV, "PATCH", `/v1/spaces/ai/inbox/${s.id}`, { token: editorToken, body: { status: "done", note: "Replied." } });
    assert.equal(patched.json.submission.status, "done");
    assert.equal(patched.json.submission.note, "Replied.");
    // Another space's key can't post into ai, and research's inbox doesn't see it.
    assert.equal((await call(DEV, "POST", "/v1/spaces/ai/submissions", { token: RESEARCH_KEY, body: { form: "interest", fields: { name: "x" } } })).status, 403);
    assert.equal((await call(DEV, "GET", "/v1/spaces/research/inbox", { token: pubToken })).json.submissions.length, 0);
  });
});

describe("introspect", () => {
  test("returns the user only for the calling key's space", async () => {
    const ok = await call(DEV, "POST", "/v1/auth/introspect", { token: "dev-ai-key", body: { token: editorToken } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.user.email, "editor@example.org");
    assert.ok(!("passwordHash" in ok.json.user));
    const other = await call(DEV, "POST", "/v1/auth/introspect", { token: RESEARCH_KEY, body: { token: editorToken } });
    assert.equal(other.status, 401);
    const bogus = await call(DEV, "POST", "/v1/auth/introspect", { token: "dev-ai-key", body: { token: "not-a-token" } });
    assert.equal(bogus.status, 401);
    const noKey = await call(DEV, "POST", "/v1/auth/introspect", { body: { token: editorToken } });
    assert.equal(noKey.status, 401);
    const userAsKey = await call(DEV, "POST", "/v1/auth/introspect", { token: editorToken, body: { token: editorToken } });
    assert.equal(userAsKey.status, 401);
  });
  test("disabled users stop introspecting", async () => {
    await call(DEV, "PATCH", `/v1/users/${editorId}`, { token: adminToken, body: { disabled: true } });
    assert.equal((await call(DEV, "POST", "/v1/auth/introspect", { token: "dev-ai-key", body: { token: editorToken } })).status, 401);
    assert.equal((await call(DEV, "GET", "/v1/auth/me", { token: editorToken })).status, 401);
    await call(DEV, "PATCH", `/v1/users/${editorId}`, { token: adminToken, body: { disabled: false } });
    // Disabling ended their sessions; re-enabling doesn't revive them.
    assert.equal((await call(DEV, "GET", "/v1/auth/me", { token: editorToken })).status, 401);
    editorToken = (await call(DEV, "POST", "/v1/auth/login", { body: { email: "editor@example.org", password: PW.editor } })).json.token;
    assert.equal((await call(DEV, "GET", "/v1/auth/me", { token: editorToken })).status, 200);
  });
});

describe("password change", () => {
  test("ends other sessions and returns a new token", async () => {
    const other = (await call(DEV, "POST", "/v1/auth/login", { body: { email: "pub@example.org", password: PW.pub } })).json.token;
    const bad = await call(DEV, "POST", "/v1/auth/password", { token: pubToken, body: { current: "wrong", next: "a new long password" } });
    assert.equal(bad.status, 400);
    const ok = await call(DEV, "POST", "/v1/auth/password", { token: pubToken, body: { current: PW.pub, next: "a new long password" } });
    assert.equal(ok.status, 200);
    assert.equal((await call(DEV, "GET", "/v1/auth/me", { token: other })).status, 401);
    assert.equal((await call(DEV, "GET", "/v1/auth/me", { token: ok.json.token })).status, 200);
  });
});

describe("audit log", () => {
  test("records actions, scoped by space; admins only", async () => {
    await new Promise((r) => setTimeout(r, 200));
    const all = await call(DEV, "GET", "/v1/audit", { token: adminToken });
    assert.equal(all.status, 200);
    const actions = new Set(all.json.events.map((e: any) => e.action));
    for (const a of ["space.register", "setup.first-admin", "login", "login.failed", "user.create", "user.update", "entry.pending",
      "entry.status.publish-pending", "entry.create.draft", "entry.delete", "entry.move", "entry.restore", "inbox.done", "webhook.ok", "user.password"]) {
      assert.ok(actions.has(a), `audit has ${a}`);
    }
    const ai = await call(DEV, "GET", "/v1/audit?space=research", { token: adminToken });
    assert.ok(ai.json.events.every((e: any) => e.space === "research"));
    assert.ok(!JSON.stringify(all.json).match(/correct horse|scrypt\$/));
    assert.equal((await call(DEV, "GET", "/v1/audit", { token: editorToken })).status, 403);
  });
});
