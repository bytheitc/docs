// Subscribing, confirming and leaving — driven through the real app over a real socket, because
// the rules that matter here are about what the endpoint *says*, not what a function returns.
import { strict as assert } from "node:assert";
import { request } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after, before, beforeEach } from "node:test";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { forget } from "../src/live.js";
import type { MailMessage } from "../src/mail.js";
import { Mailer } from "../src/mail.js";
import { createNotifier } from "../src/notify.js";
import { setStore } from "../src/store/index.js";
import { unsubscribeToken, verifyUnsubscribeToken, incidentEmail } from "../src/subscribers.js";
import type { Incident, Service, StatusStore, Subscriber, Tenant } from "../src/types.js";

const SECRET = "test-secret-not-a-real-one";

const tenant: Tenant = {
  id: "itc", name: "Islamic Tech Collective", hosts: ["status.example.org"],
  brand: { tagline: "", supportUrl: "", accent: "#0f766e", logoUrl: "" },
  adminTokenHash: "c".repeat(64), createdAt: new Date("2026-01-01T00:00:00Z"),
};

const service: Service = {
  id: "s1", tenantId: "itc", name: "Portal", description: "", group: "", order: 0, listed: true,
  createdAt: new Date(),
  check: { kind: "http", url: "https://x.invalid/health", method: "GET", expectStatus: [200], timeoutMs: 1000, degradedMs: 0 },
};

/** An in-memory store: enough of the interface for these routes, and no database. */
function memoryStore() {
  const subs = new Map<string, Subscriber>();
  const incidents = new Map<string, Incident>();
  const key = (t: string, e: string) => `${t}|${e}`;
  return {
    subs,
    incidents,
    store: {
      kind: "memory",
      async close() {},
      async getTenant(id: string) { return id === tenant.id ? tenant : null; },
      async getTenantByHost(h: string) { return tenant.hosts.includes(h) ? tenant : null; },
      async listTenants() { return [tenant]; },
      async listServices() { return [service]; },
      async listAllServices() { return [service]; },
      async latestResults() { return {}; },
      async buckets() { return []; },
      async listIncidents() { return [...incidents.values()]; },
      async getIncident(id: string) { return incidents.get(id) ?? null; },
      async addIncident(i: Incident) { incidents.set(i.id, i); },
      async updateIncident(id: string, patch: Partial<Incident>) { Object.assign(incidents.get(id)!, patch); },
      async getSubscriber(t: string, e: string) { return subs.get(key(t, e)) ?? null; },
      async putSubscriber(s: Subscriber) { subs.set(key(s.tenantId, s.email), { ...s }); },
      async patchSubscriber(t: string, e: string, patch: Partial<Subscriber>) {
        const s = subs.get(key(t, e));
        if (s) subs.set(key(t, e), { ...s, ...patch });
      },
      async subscriberById(id: string) { return [...subs.values()].find((s) => s.id === id) ?? null; },
      async subscriberByConfirmHash(h: string) { return [...subs.values()].find((s) => s.confirmTokenHash === h) ?? null; },
      async listConfirmedSubscribers(t: string) { return [...subs.values()].filter((s) => s.tenantId === t && s.status === "confirmed"); },
      async subscriberCounts() { return { pending: 0, confirmed: 0, unsubscribed: 0 }; },
    } as unknown as StatusStore,
  };
}

/** A mailer that collects instead of sending, and can be told to fail. */
function fakeMailer() {
  const sent: MailMessage[] = [];
  let fail = false;
  const m = new Mailer({ provider: "none", from: "Status <no-reply@example.org>" });
  (m as unknown as { adapter: unknown }).adapter = {
    kind: "fake",
    delivers: true,
    async send(msg: MailMessage) {
      if (fail) return { ok: false as const, error: "provider down" };
      sent.push(msg);
      return { ok: true as const };
    },
  };
  return { mailer: m, sent, setFail: (v: boolean) => (fail = v) };
}

let base = "";
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
let mem = memoryStore();
let mail = fakeMailer();

function http(method: string, path: string, opts: { json?: unknown; form?: string; host?: string } = {}) {
  return new Promise<{ status: number; text: string }>((resolve, reject) => {
    const headers: Record<string, string> = { host: opts.host ?? "status.example.org" };
    let payload = "";
    if (opts.json !== undefined) { payload = JSON.stringify(opts.json); headers["content-type"] = "application/json"; }
    if (opts.form !== undefined) { payload = opts.form; headers["content-type"] = "application/x-www-form-urlencoded"; }
    if (payload) headers["content-length"] = String(Buffer.byteLength(payload));
    const req = request(`${base}${path}`, { method, headers }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text: body }));
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

before(async () => {
  const config = { ...loadConfig({ PORT: "0", API_LOG: "off", SUBSCRIBE_LIMIT: "500" } as NodeJS.ProcessEnv), subscribeSecret: SECRET, rootTenant: "" };
  mail = fakeMailer();
  const notifier = createNotifier(config, mail.mailer);
  server = createApp(config, { stop() {}, async runAll() { return { checked: 0, down: 0 }; } }, { mailer: mail.mailer, notifier }).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => { server.close(); setStore(null); });

beforeEach(() => {
  mem = memoryStore();
  setStore(mem.store);
  mail.sent.length = 0;
  mail.setFail(false);
  forget();
});

const linkFrom = (text: string, path: string) => text.match(new RegExp(`\\S*${path}\\?token=\\S+`))?.[0] ?? "";
const tokenFrom = (url: string) => decodeURIComponent(url.split("token=")[1] ?? "");

/* ---------------- the unsubscribe token ---------------- */

test("an unsubscribe token round-trips, and a tampered one does not", () => {
  const t = unsubscribeToken("abc-123", SECRET);
  assert.equal(verifyUnsubscribeToken(t, SECRET), "abc-123");
  assert.equal(verifyUnsubscribeToken(t, "a different secret"), null);
  assert.equal(verifyUnsubscribeToken(`${t}x`, SECRET), null);
  assert.equal(verifyUnsubscribeToken("abc-123.not-a-signature", SECRET), null);
  assert.equal(verifyUnsubscribeToken("nonsense", SECRET), null);
  assert.equal(verifyUnsubscribeToken("", SECRET), null);
});

test("the same id always yields the same token, so every email can carry one", () => {
  assert.equal(unsubscribeToken("abc-123", SECRET), unsubscribeToken("abc-123", SECRET));
  assert.notEqual(unsubscribeToken("abc-123", SECRET), unsubscribeToken("abc-124", SECRET));
});

/* ---------------- subscribing ---------------- */

test("subscribing stores a pending record and sends exactly one confirmation", async () => {
  const res = await http("POST", "/subscribe", { json: { email: "Amina@Example.org" } });
  assert.equal(res.status, 202);
  assert.equal(mail.sent.length, 1);
  assert.equal(mail.sent[0].to, "amina@example.org", "the address is normalised to lower case");
  assert.match(mail.sent[0].subject, /Confirm/);

  const sub = [...mem.subs.values()][0];
  assert.equal(sub.status, "pending");
  assert.equal(sub.email, "amina@example.org");
  assert.ok(sub.confirmTokenHash, "only the digest is stored");
  assert.equal(mail.sent[0].text.includes(sub.confirmTokenHash!), false, "the digest is not what is mailed");
});

test("an address already confirmed is answered the same way, and mailed nothing", async () => {
  await http("POST", "/subscribe", { json: { email: "amina@example.org" } });
  const confirm = linkFrom(mail.sent[0].text, "/confirm");
  await http("GET", `/confirm?token=${encodeURIComponent(tokenFrom(confirm))}`);
  mail.sent.length = 0;

  const again = await http("POST", "/subscribe", { json: { email: "amina@example.org" } });
  assert.equal(again.status, 202, "the same answer, so this cannot be used to discover who is subscribed");
  assert.equal(mail.sent.length, 0, "and no second email, so it cannot be used to pester them");
});

test("a second attempt within the cooldown sends nothing", async () => {
  await http("POST", "/subscribe", { json: { email: "yusuf@example.org" } });
  assert.equal(mail.sent.length, 1);
  const again = await http("POST", "/subscribe", { json: { email: "yusuf@example.org" } });
  assert.equal(again.status, 202);
  assert.equal(mail.sent.length, 1, "still one");
});

test("the honeypot is accepted and dropped", async () => {
  const res = await http("POST", "/subscribe", { json: { email: "bot@example.org", honeypot: "http://spam" } });
  assert.equal(res.status, 202);
  assert.equal(mail.sent.length, 0);
  assert.equal(mem.subs.size, 0);
});

test("a malformed address is refused", async () => {
  const res = await http("POST", "/subscribe", { json: { email: "not-an-address" } });
  assert.equal(res.status, 400);
  assert.equal(mail.sent.length, 0);
});

/* ---------------- confirming ---------------- */

test("the emailed link confirms, and cannot be used twice", async () => {
  await http("POST", "/subscribe", { json: { email: "amina@example.org" } });
  const token = tokenFrom(linkFrom(mail.sent[0].text, "/confirm"));

  const ok = await http("GET", `/confirm?token=${encodeURIComponent(token)}`);
  assert.equal(ok.status, 200);
  assert.match(ok.text, /You&#39;re subscribed|You're subscribed/);
  assert.equal([...mem.subs.values()][0].status, "confirmed");

  const twice = await http("GET", `/confirm?token=${encodeURIComponent(token)}`);
  assert.equal(twice.status, 400, "the token is cleared on use");
});

test("a confirmation link that never existed is refused", async () => {
  const res = await http("GET", "/confirm?token=made-up");
  assert.equal(res.status, 400);
  assert.match(res.text, /didn&#39;t work|didn't work/);
});

/* ---------------- notifications ---------------- */

async function confirmed(email: string) {
  await http("POST", "/subscribe", { json: { email } });
  const token = tokenFrom(linkFrom(mail.sent[mail.sent.length - 1].text, "/confirm"));
  await http("GET", `/confirm?token=${encodeURIComponent(token)}`);
}

test("only confirmed addresses are notified, and every message carries a way out", async () => {
  await confirmed("amina@example.org");
  await http("POST", "/subscribe", { json: { email: "pending@example.org" } });
  mail.sent.length = 0;

  const config = { ...loadConfig({ PORT: "0" } as NodeJS.ProcessEnv), subscribeSecret: SECRET };
  const notifier = createNotifier(config, mail.mailer);
  const incident: Incident = {
    id: "i1", tenantId: "itc", title: "Sign-in is failing", impact: "major", status: "investigating",
    serviceIds: ["s1"], startedAt: new Date(),
    updates: [{ at: new Date(), status: "investigating", body: "Looking into it." }],
  };
  const out = await notifier.sendIncident(tenant, incident, "opened");

  assert.equal(out.sent, 1);
  assert.equal(mail.sent.length, 1);
  assert.equal(mail.sent[0].to, "amina@example.org", "the pending address gets nothing");
  assert.match(mail.sent[0].subject, /Investigating: Sign-in is failing/);
  assert.match(mail.sent[0].text, /Portal/, "the affected service is named, not its id");
  assert.match(mail.sent[0].text, /\/unsubscribe\?token=/);
});

test("the unsubscribe link in a notification actually works", async () => {
  await confirmed("amina@example.org");
  mail.sent.length = 0;
  const config = { ...loadConfig({ PORT: "0" } as NodeJS.ProcessEnv), subscribeSecret: SECRET };
  await createNotifier(config, mail.mailer).sendIncident(
    tenant,
    { id: "i1", tenantId: "itc", title: "x", impact: "minor", status: "investigating", serviceIds: [], startedAt: new Date(), updates: [{ at: new Date(), status: "investigating", body: "b" }] },
    "opened",
  );
  const token = tokenFrom(linkFrom(mail.sent[0].text, "/unsubscribe"));

  // A GET only ever offers the button: scanners and mail clients follow links on their own.
  const shown = await http("GET", `/unsubscribe?token=${encodeURIComponent(token)}`);
  assert.equal(shown.status, 200);
  assert.match(shown.text, /<button/);
  assert.equal([...mem.subs.values()][0].status, "confirmed", "looking at the page must not unsubscribe anyone");

  const done = await http("POST", "/unsubscribe", { form: `token=${encodeURIComponent(token)}` });
  assert.equal(done.status, 200);
  assert.equal([...mem.subs.values()][0].status, "unsubscribed");
});

test("someone who left is not notified again", async () => {
  await confirmed("amina@example.org");
  const sub = [...mem.subs.values()][0];
  await mem.store.patchSubscriber("itc", sub.email, { status: "unsubscribed" });
  mail.sent.length = 0;

  const config = { ...loadConfig({ PORT: "0" } as NodeJS.ProcessEnv), subscribeSecret: SECRET };
  const out = await createNotifier(config, mail.mailer).sendIncident(
    tenant,
    { id: "i2", tenantId: "itc", title: "y", impact: "minor", status: "investigating", serviceIds: [], startedAt: new Date(), updates: [{ at: new Date(), status: "investigating", body: "b" }] },
    "opened",
  );
  assert.equal(out.sent, 0);
  assert.equal(mail.sent.length, 0);
});

test("a mail provider that is failing does not stop an incident being recorded", async () => {
  await confirmed("amina@example.org");
  mail.setFail(true);
  mail.sent.length = 0;

  const config = { ...loadConfig({ PORT: "0" } as NodeJS.ProcessEnv), subscribeSecret: SECRET };
  const out = await createNotifier(config, mail.mailer).sendIncident(
    tenant,
    { id: "i3", tenantId: "itc", title: "z", impact: "critical", status: "investigating", serviceIds: [], startedAt: new Date(), updates: [{ at: new Date(), status: "investigating", body: "b" }] },
    "opened",
  );
  assert.equal(out.sent, 0);
  assert.equal(out.failed, 1, "counted as failed, and reported, rather than thrown");
});

/* ---------------- what the messages say ---------------- */

test("the subject carries the headline, so it reads without being opened", () => {
  const base = {
    tenantName: "ITC", pageUrl: "https://s.example/s/itc", manageUrl: "https://s.example/unsubscribe?token=t",
    title: "Sign-in is failing", impact: "major", status: "investigating", body: "Looking.",
    services: ["Portal"], scheduled: false,
  };
  assert.match(incidentEmail({ ...base, kind: "opened" }).subject, /^\[ITC\] Investigating: Sign-in is failing$/);
  assert.match(incidentEmail({ ...base, kind: "updated" }).subject, /^\[ITC\] Update: /);
  assert.match(incidentEmail({ ...base, kind: "resolved" }).subject, /^\[ITC\] Resolved: /);
  assert.match(incidentEmail({ ...base, kind: "opened", scheduled: true }).subject, /^\[ITC\] Scheduled: /);
});

/* ---------------- switched off ---------------- */

test("with no signing secret, subscribing is refused rather than silently dropped", async () => {
  const config = { ...loadConfig({ PORT: "0", API_LOG: "off" } as NodeJS.ProcessEnv), subscribeSecret: "", rootTenant: "" };
  const m = fakeMailer();
  const app = createApp(config, { stop() {}, async runAll() { return { checked: 0, down: 0 }; } }, { mailer: m.mailer, notifier: createNotifier(config, m.mailer) });
  const s = app.listen(0);
  await new Promise((r) => s.once("listening", r));
  const port = (s.address() as AddressInfo).port;
  try {
    const res = await new Promise<number>((resolve, reject) => {
      const payload = JSON.stringify({ email: "a@example.org" });
      const req = request(`http://127.0.0.1:${port}/subscribe`, {
        method: "POST",
        headers: { host: "status.example.org", "content-type": "application/json", "content-length": String(Buffer.byteLength(payload)) },
      }, (r) => { r.resume(); r.on("end", () => resolve(r.statusCode ?? 0)); });
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
    assert.equal(res, 400);
    assert.equal(m.sent.length, 0, "mail that cannot be unsubscribed from is not sent at all");
  } finally {
    s.close();
  }
});
