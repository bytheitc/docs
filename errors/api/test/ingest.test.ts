// Ingest end to end over HTTP: the protocol, grouping, regressions, auth, retries and alerts.
// Runs against the memory store, and against MongoDB too when TEST_MONGODB_URI answers.
import { strict as assert } from "node:assert";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { gzipSync } from "node:zlib";

import { createApp } from "../src/app.js";
import { CmsClient } from "../src/cms.js";
import { loadConfig } from "../src/config.js";
import { normalize, parseEnvelope } from "../src/event.js";
import { createMemoryStore } from "../src/store/memory.js";
import { createMongoStore } from "../src/store/mongo.js";
import { setStore } from "../src/store/index.js";
import type { ErrorsStore } from "../src/store/types.js";

const KEY = "0123456789abcdef0123456789abcdef";
const listen = (s: Server) => new Promise<string>((r) => s.listen(0, () => r(`http://127.0.0.1:${(s.address() as AddressInfo).port}`)));

function errorEvent(opts: { id?: string; type?: string; value?: string; fn?: string; release?: string } = {}) {
  return {
    event_id: opts.id ?? crypto.randomUUID().replace(/-/g, ""),
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    release: opts.release ?? "1.0.0",
    environment: "production",
    exception: { values: [{ type: opts.type ?? "TypeError", value: opts.value ?? "Cannot read properties of undefined (reading 'id')", stacktrace: { frames: [
      { function: "Module._load", filename: "node:internal/modules/cjs/loader", lineno: 1, in_app: false },
      { function: opts.fn ?? "renderProfile", filename: "/app/src/profile.ts", lineno: Math.floor(Math.random() * 500), in_app: true },
    ] } }] },
    request: { method: "GET", url: "/u/someone?token=secret", headers: { "user-agent": "t", authorization: "Bearer leak", cookie: "s=leak" } },
  };
}
const envelope = (ev: Record<string, unknown>) => `${JSON.stringify({ event_id: ev.event_id, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(ev)}\n`;

async function harness(store: ErrorsStore, env: Record<string, string> = {}) {
  setStore(store);
  await store.createProject({ id: "4242", slug: "site-api", name: "site-api", publicKey: KEY, createdAt: new Date(), createdBy: "test" });
  const config = loadConfig({ API_LOG: "off", PROJECT_RATE_PER_MIN: "1000", ...env });
  const server = createServer(createApp({ config, cms: new CmsClient(config) }));
  const base = await listen(server);
  const send = (body: string | Buffer, headers: Record<string, string> = {}, path = "/api/4242/envelope/") =>
    fetch(base + path, { method: "POST", headers: { "content-type": "application/x-sentry-envelope", "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${KEY}`, ...headers }, body });
  return { base, send, close: async () => { await new Promise<void>((r) => server.close(() => r())); await store.close(); } };
}

const stores: [string, () => Promise<ErrorsStore | null>][] = [
  ["memory", async () => createMemoryStore()],
  ["mongo", async () => {
    const uri = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27099";
    const s = createMongoStore(uri, `errors_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`);
    try { await s.listProjects(); return s; } catch { return null; }
  }],
];

for (const [name, make] of stores) {
  test(`${name}: the same error twice is one issue with two events; line numbers don't split it`, async (t) => {
    const store = await make();
    if (!store) return t.skip("no MongoDB");
    const h = await harness(store);
    try {
      assert.equal((await h.send(envelope(errorEvent()))).status, 200);
      assert.equal((await h.send(envelope(errorEvent()))).status, 200);
      const issues = await store.listIssues({});
      assert.equal(issues.length, 1);
      assert.equal(issues[0].count, 2);
      assert.equal(issues[0].title, "TypeError: Cannot read properties of undefined (reading 'id')");
      assert.equal(issues[0].culprit, "renderProfile (/app/src/profile.ts)");
      // A different function is a different issue.
      await h.send(envelope(errorEvent({ fn: "saveDraft" })));
      assert.equal((await store.listIssues({})).length, 2);
    } finally { await h.close(); }
  });

  test(`${name}: a resolved issue that happens again is a regression and reopens`, async (t) => {
    const store = await make();
    if (!store) return t.skip("no MongoDB");
    const h = await harness(store);
    try {
      await h.send(envelope(errorEvent()));
      const [issue] = await store.listIssues({});
      await store.setIssueStatus(issue.id, "resolved", "a@itc");
      assert.equal((await store.listIssues({})).length, 0);
      await h.send(envelope(errorEvent({ release: "1.0.1" })));
      const again = await store.getIssue(issue.id);
      assert.equal(again?.status, "unresolved");
      assert.equal(again?.resolvedBy, undefined);
      assert.deepEqual(again?.releases.sort(), ["1.0.0", "1.0.1"]);
      // An ignored issue stays ignored.
      await store.setIssueStatus(issue.id, "ignored", "a@itc");
      await h.send(envelope(errorEvent()));
      assert.equal((await store.getIssue(issue.id))?.status, "ignored");
    } finally { await h.close(); }
  });

  test(`${name}: an SDK retry with the same event id is counted once`, async (t) => {
    const store = await make();
    if (!store) return t.skip("no MongoDB");
    const h = await harness(store);
    try {
      const ev = errorEvent({ id: "a".repeat(32) });
      await h.send(envelope(ev));
      await h.send(envelope(ev));
      assert.equal((await store.listIssues({}))[0].count, 1);
    } finally { await h.close(); }
  });
}

test("auth: a wrong key, an unknown project and no key are all refused", async () => {
  const h = await harness(createMemoryStore());
  try {
    assert.equal((await h.send(envelope(errorEvent()), { "x-sentry-auth": "Sentry sentry_key=nope" })).status, 401);
    assert.equal((await h.send(envelope(errorEvent()), {}, "/api/9999/envelope/")).status, 401);
    const noKey = await fetch(`${h.base}/api/4242/envelope/`, { method: "POST", body: envelope(errorEvent()) });
    assert.equal(noKey.status, 401);
    // The key may also come from the query string (browsers) or the envelope's own DSN.
    const viaQuery = await fetch(`${h.base}/api/4242/envelope/?sentry_key=${KEY}`, { method: "POST", body: envelope(errorEvent()) });
    assert.equal(viaQuery.status, 200);
  } finally { await h.close(); }
});

test("protocol: gzip bodies, the store endpoint, non-event items and CORS preflight", async () => {
  const store = createMemoryStore();
  const h = await harness(store);
  try {
    assert.equal((await h.send(gzipSync(envelope(errorEvent())), { "content-encoding": "gzip" })).status, 200);
    assert.equal((await h.send(JSON.stringify(errorEvent({ fn: "viaStore" })), { "content-type": "application/json" }, "/api/4242/store/")).status, 200);
    const session = `${JSON.stringify({})}\n${JSON.stringify({ type: "session" })}\n${JSON.stringify({ sid: "x" })}\n`;
    assert.equal((await h.send(session)).status, 200);
    assert.equal((await store.listIssues({})).length, 2);
    const pre = await fetch(`${h.base}/api/4242/envelope/`, { method: "OPTIONS" });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get("access-control-allow-origin"), "*");
    assert.equal((await h.send("not an envelope")).status, 400);
  } finally { await h.close(); }
});

test("privacy: credentials and query strings are never stored", async () => {
  const store = createMemoryStore();
  const h = await harness(store);
  try {
    await h.send(envelope(errorEvent()));
    const [issue] = await store.listIssues({});
    const [ev] = await store.listEvents(issue.id, 1);
    assert.equal(ev.request?.url, "/u/someone");
    assert.equal(ev.request?.headers?.authorization, undefined);
    assert.equal(ev.request?.headers?.cookie, undefined);
    assert.equal(ev.request?.headers?.["user-agent"], "t");
  } finally { await h.close(); }
});

test("alerts: a new issue and a regression alert once each; repeats and cooldown stay quiet", async () => {
  const hooks: Record<string, unknown>[] = [];
  const sink = createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c)).on("end", () => { hooks.push(JSON.parse(b)); res.end("ok"); });
  });
  const sinkUrl = await listen(sink);
  const store = createMemoryStore();
  const h = await harness(store, { ALERT_WEBHOOK_URL: sinkUrl, ALERT_COOLDOWN_MINUTES: "60", PUBLIC_URL: "https://errors.bytheitc.xyz" });
  try {
    await h.send(envelope(errorEvent()));
    await h.send(envelope(errorEvent()));
    assert.equal(hooks.length, 1);
    assert.match(String(hooks[0].text), /^New issue in site-api: TypeError/);
    assert.match(String(hooks[0].text), /https:\/\/errors\.bytheitc\.xyz\/issues\//);
    // A regression inside the cooldown does not alert again...
    const [issue] = await store.listIssues({});
    await store.setIssueStatus(issue.id, "resolved", "a@itc");
    await h.send(envelope(errorEvent()));
    assert.equal(hooks.length, 1);
    // ...but once the cooldown has passed, it does.
    assert.equal(await store.claimAlert(issue.id, 60 * 60_000, new Date(Date.now() + 61 * 60_000)), true);
  } finally {
    await h.close();
    await new Promise<void>((r) => sink.close(() => r()));
  }
});

test("normalize: messages group by shape, an SDK fingerprint wins, envelopes with lengths parse", () => {
  const a = normalize({ message: "User 1234 not found in shard 7" });
  const b = normalize({ message: "User 98 not found in shard 3" });
  assert.equal(a.fingerprint, b.fingerprint);
  const c = normalize({ message: "x", fingerprint: ["checkout", "{{ default }}"] });
  const d = normalize({ message: "x", fingerprint: ["billing", "{{ default }}"] });
  assert.notEqual(c.fingerprint, d.fingerprint);
  const payload = JSON.stringify({ message: "line one\nline two" });
  const raw = Buffer.from(`{}\n${JSON.stringify({ type: "event", length: Buffer.byteLength(payload) })}\n${payload}\n`);
  assert.equal(parseEnvelope(raw).events.length, 1);
});
