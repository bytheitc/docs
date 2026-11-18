// Collection end to end over HTTP, the stats both stores compute, and the tracker script itself run
// in a stubbed browser. Runs against the memory store, and against MongoDB too when TEST_MONGODB_URI
// (or a local mongod on 27099, as in CI) answers.
import { strict as assert } from "node:assert";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import vm from "node:vm";

import { createApp } from "../src/app.js";
import { CmsClient } from "../src/cms.js";
import { loadConfig } from "../src/config.js";
import { browserOf, cleanPath, deviceOf, hostAllowed, isBot, osOf } from "../src/hit.js";
import { parseDomains } from "../src/routes/ui.js";
import { setStore } from "../src/store/index.js";
import { createMemoryStore } from "../src/store/memory.js";
import { createMongoStore } from "../src/store/mongo.js";
import { dayOf } from "../src/store/stats.js";
import type { AnalyticsStore, Hit } from "../src/store/types.js";
import { TRACKER } from "../src/tracker.js";

process.env.TRUST_PROXY = "on"; // so X-Forwarded-For stands in for different visitors

const SITE = "a1b2c3d4e5f6";
const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const listen = (s: Server) => new Promise<string>((r) => s.listen(0, () => r(`http://127.0.0.1:${(s.address() as AddressInfo).port}`)));
const today = () => dayOf(new Date());

async function harness(store: AnalyticsStore) {
  setStore(store);
  await store.createSite({ id: SITE, slug: "engineering", name: "Engineering", domains: ["engineering.bytheitc.xyz"], createdAt: new Date(), createdBy: "test" });
  const config = loadConfig({ API_LOG: "off", COLLECT_RATE_PER_MIN: "1000" });
  const server = createServer(createApp({ config, cms: new CmsClient(config) }));
  const base = await listen(server);
  const send = (body: unknown, opts: { ip?: string; ua?: string; headers?: Record<string, string> } = {}) =>
    fetch(`${base}/api/event`, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=UTF-8", "user-agent": opts.ua ?? CHROME, "x-forwarded-for": opts.ip ?? "203.0.113.7", ...opts.headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  const stats = () => store.stats(SITE, today(), today());
  return { base, send, stats, close: async () => { await new Promise<void>((r) => server.close(() => r())); await store.close(); } };
}

const stores: [string, () => Promise<AnalyticsStore | null>][] = [
  ["memory", async () => createMemoryStore()],
  ["mongo", async () => {
    const uri = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27099";
    const s = createMongoStore(uri, `analytics_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`);
    try { await s.listSites(); return s; } catch { return null; }
  }],
];

for (const [name, make] of stores) {
  test(`${name}: page views count once per visitor per day; a different browser is a different visitor`, async (t) => {
    const store = await make();
    if (!store) return t.skip("no MongoDB");
    const h = await harness(store);
    try {
      const page = (path: string) => ({ s: SITE, u: `https://engineering.bytheitc.xyz${path}`, w: 1280 });
      assert.equal((await h.send(page("/"))).status, 202);
      assert.equal((await h.send(page("/blog"))).status, 202);
      assert.equal((await h.send(page("/blog/"), { ua: IPHONE })).status, 202);
      assert.equal((await h.send(page("/"), { ip: "198.51.100.9" })).status, 202);
      const st = await h.stats();
      assert.equal(st.pageviews, 4);
      assert.equal(st.visitors, 3);
      assert.deepEqual(st.top.path.map((r) => [r.key, r.visitors, r.count]), [["/", 2, 2], ["/blog", 2, 2]]);
      assert.deepEqual(st.top.os.map((r) => r.key).sort(), ["iOS", "macOS"]);
      assert.equal(st.days.length, 1);
      assert.equal(st.days[0].visitors, 3);
      assert.equal(await store.live(SITE, new Date(Date.now() - 60_000)), 3);
    } finally { await h.close(); }
  });

  test(`${name}: only the path is kept; referrers keep their host and the site's own pages aren't referrers`, async (t) => {
    const store = await make();
    if (!store) return t.skip("no MongoDB");
    const h = await harness(store);
    try {
      await h.send({ s: SITE, u: "https://www.engineering.bytheitc.xyz/jobs/?email=someone@x.org&utm_source=Newsletter#apply", r: "https://www.google.com/search?q=private", w: 400 });
      await h.send({ s: SITE, u: "https://engineering.bytheitc.xyz/about", r: "https://engineering.bytheitc.xyz/jobs", w: 400 });
      const st = await h.stats();
      assert.deepEqual(st.top.path.map((r) => r.key).sort(), ["/about", "/jobs"]);
      assert.deepEqual(st.top.ref.map((r) => r.key).sort(), ["", "google.com"]);
      assert.deepEqual(st.top.source.filter((r) => r.key).map((r) => r.key), ["newsletter"]);
      assert.deepEqual(st.top.device.map((r) => r.key), ["Mobile"]);
      // Nothing stored anywhere carries the query, the search terms or the address.
      const dump = JSON.stringify(st);
      for (const leak of ["someone@x.org", "private", "203.0.113.7"]) assert.ok(!dump.includes(leak), leak);
    } finally { await h.close(); }
  });

  test(`${name}: other hosts, bots and opt-outs are dropped with a reason; bad input is refused`, async (t) => {
    const store = await make();
    if (!store) return t.skip("no MongoDB");
    const h = await harness(store);
    try {
      const drop = async (r: Response) => { assert.equal(r.status, 202); return r.headers.get("x-analytics-drop"); };
      assert.equal(await drop(await h.send({ s: SITE, u: "https://copycat.example.net/" })), "host not allowed");
      assert.equal(await drop(await h.send({ s: SITE, u: "https://bytheitc.xyz.evil.net/" })), "host not allowed");
      assert.equal(await drop(await h.send({ s: SITE, u: "https://engineering.bytheitc.xyz/" }, { ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" })), "bot");
      assert.equal(await drop(await h.send({ s: SITE, u: "https://engineering.bytheitc.xyz/" }, { headers: { "sec-gpc": "1" } })), "opt-out");
      assert.equal(await drop(await h.send({ s: SITE, u: "javascript:alert(1)" })), "bad url");
      assert.equal((await h.send({ s: "nope", u: "https://engineering.bytheitc.xyz/" })).status, 404);
      assert.equal((await h.send("not json")).status, 400);
      assert.equal((await h.send({ u: "https://engineering.bytheitc.xyz/" })).status, 400);
      assert.equal(await drop(await h.send({ s: SITE, n: "<script>", u: "https://engineering.bytheitc.xyz/" })), "bad event name");
      assert.equal((await h.stats()).pageviews, 0);
    } finally { await h.close(); }
  });

  test(`${name}: custom events are counted apart from page views`, async (t) => {
    const store = await make();
    if (!store) return t.skip("no MongoDB");
    const h = await harness(store);
    try {
      await h.send({ s: SITE, u: "https://engineering.bytheitc.xyz/join" });
      await h.send({ s: SITE, n: "Apply: started", u: "https://engineering.bytheitc.xyz/join" });
      await h.send({ s: SITE, n: "Apply: started", u: "https://engineering.bytheitc.xyz/join" });
      await h.send({ s: SITE, n: "Apply: started", u: "https://engineering.bytheitc.xyz/join" }, { ip: "198.51.100.9" });
      const st = await h.stats();
      assert.equal(st.pageviews, 1);
      assert.deepEqual(st.events, [{ key: "Apply: started", visitors: 2, count: 3 }]);
    } finally { await h.close(); }
  });

  test(`${name}: one salt per day, shared; visitors over a range are the sum of each day's`, async (t) => {
    const store = await make();
    if (!store) return t.skip("no MongoDB");
    try {
      const [a, b] = await Promise.all([store.salt("2026-11-16"), store.salt("2026-11-16")]);
      assert.equal(a, b);
      assert.notEqual(a, await store.salt("2026-11-17"));

      const hit = (day: string, visitor: string, path = "/"): Hit => ({ site: "s1", ts: new Date(`${day}T12:00:00Z`), day, name: "pageview", path, ref: "", source: "", country: "GB", device: "Laptop", browser: "Chrome", os: "macOS", visitor });
      const recent = (n: number) => dayOf(new Date(Date.now() - n * 864e5));
      for (const x of [hit(recent(2), "v1"), hit(recent(2), "v1", "/a"), hit(recent(1), "v1"), hit(recent(1), "v2"), hit(recent(0), "v3")]) await store.record(x, 400);
      const st = await store.stats("s1", recent(2), recent(0));
      assert.equal(st.visitors, 4); // v1 twice (two days), v2, v3
      assert.equal(st.pageviews, 5);
      assert.deepEqual(st.days.map((d) => d.visitors), [1, 2, 1]);
      assert.deepEqual(st.top.country, [{ key: "GB", visitors: 4, count: 5 }]);
      assert.deepEqual((await store.stats("s1", recent(1), recent(1))).days.map((d) => d.pageviews), [2]);
    } finally { await store.close(); }
  });
}

test("the script is served as cacheable JavaScript", async () => {
  const h = await harness(createMemoryStore());
  try {
    const r = await fetch(`${h.base}/script.js`);
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type") ?? "", /javascript/);
    assert.match(r.headers.get("cache-control") ?? "", /max-age=3600/);
    assert.equal(r.headers.get("cross-origin-resource-policy"), "cross-origin");
    assert.equal(await r.text(), TRACKER);
    const pre = await fetch(`${h.base}/api/event`, { method: "OPTIONS" });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get("access-control-allow-origin"), "*");
  } finally { await h.close(); }
});

test("staff pages need a signed-in session", async () => {
  const h = await harness(createMemoryStore());
  try {
    for (const p of ["/", "/sites", "/sites/engineering"]) {
      const r = await fetch(h.base + p, { redirect: "manual" });
      assert.equal(r.status, 303, p);
      assert.match(r.headers.get("location") ?? "", /^\/login\?next=/);
    }
    const login = await fetch(`${h.base}/login`);
    assert.equal(login.status, 200);
    assert.match(login.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
    const cross = await fetch(`${h.base}/sites`, { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/x-www-form-urlencoded" }, body: "name=x&domains=x.org", redirect: "manual" });
    assert.equal(cross.status, 403);
  } finally { await h.close(); }
});

/* ---------- the tracker, in a stubbed browser ---------- */

function browser(opts: { href?: string; referrer?: string; dnt?: string; gpc?: boolean; ignore?: boolean; hostname?: string } = {}) {
  const sent: Record<string, unknown>[] = [];
  const listeners: Record<string, ((e: unknown) => void)[]> = {};
  const loc = new URL(opts.href ?? "https://engineering.bytheitc.xyz/");
  const location = { get href() { return loc.href; }, get pathname() { return loc.pathname; }, get hostname() { return opts.hostname ?? loc.hostname; }, get protocol() { return loc.protocol; } };
  const script = { src: "https://analytics.bytheitc.xyz/script.js", getAttribute: (k: string) => (k === "data-site" ? SITE : null) };
  const history = { pushState(_s: unknown, _t: string, url: string) { const u = new URL(url, loc); loc.pathname = u.pathname; loc.search = u.search; } };
  const window = {
    innerWidth: 390,
    localStorage: { getItem: (k: string) => (k === "itc_ignore" && opts.ignore ? "1" : null) },
    addEventListener: (t: string, f: (e: unknown) => void) => { (listeners[t] ??= []).push(f); },
  } as Record<string, unknown>;
  const ctx = {
    window, location, history,
    document: { currentScript: script, referrer: opts.referrer ?? "", visibilityState: "visible", querySelector: () => script, addEventListener: (t: string, f: (e: unknown) => void) => { (listeners[`doc:${t}`] ??= []).push(f); } },
    navigator: { doNotTrack: opts.dnt, globalPrivacyControl: opts.gpc, webdriver: false, sendBeacon: (url: string, body: string) => { assert.equal(url, "https://analytics.bytheitc.xyz/api/event"); sent.push(JSON.parse(body)); return true; } },
    fetch: () => { throw new Error("fetch should not be needed when sendBeacon works"); },
    JSON, String,
  };
  vm.runInNewContext(TRACKER, ctx);
  const click = (attr: string | null) => listeners["doc:click"]?.forEach((f) => f({ target: { getAttribute: (k: string) => (k === "data-itc-event" ? attr : null), parentNode: null } }));
  return { sent, history: ctx.history, window, click, popstate: () => listeners.popstate?.forEach((f) => f({})) };
}

test("tracker: first view carries the referrer; client-side navigation counts once per path", () => {
  const b = browser({ referrer: "https://news.ycombinator.com/" });
  b.history.pushState({}, "", "/blog");
  b.history.pushState({}, "", "/blog?page=2"); // same path: not a new view
  b.history.pushState({}, "", "/");
  assert.deepEqual(b.sent, [
    { s: SITE, u: "https://engineering.bytheitc.xyz/", w: 390, r: "https://news.ycombinator.com/" },
    { s: SITE, u: "https://engineering.bytheitc.xyz/blog", w: 390 },
    { s: SITE, u: "https://engineering.bytheitc.xyz/", w: 390 },
  ]);
});

test("tracker: custom events from itc() and data-itc-event", () => {
  const b = browser();
  (b.window.itc as (n: string) => void)("signup");
  b.click("Apply: started");
  b.click(null);
  assert.deepEqual(b.sent.slice(1).map((x) => x.n), ["signup", "Apply: started"]);
});

test("tracker: silent under Do Not Track, GPC, the opt-out flag and on localhost", () => {
  for (const o of [{ dnt: "1" }, { gpc: true }, { ignore: true }, { hostname: "localhost" }]) {
    const b = browser(o);
    b.history.pushState({}, "", "/x");
    (b.window.itc as (n: string) => void)("e");
    assert.equal(b.sent.length, 0, JSON.stringify(o));
  }
});

test("helpers", () => {
  assert.ok(isBot("curl/8.4.0"));
  assert.ok(isBot(""));
  assert.ok(!isBot(CHROME));
  assert.equal(browserOf(CHROME), "Chrome");
  assert.equal(browserOf(IPHONE), "Safari");
  assert.equal(browserOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0"), "Edge");
  assert.equal(osOf(IPHONE), "iOS");
  assert.equal(deviceOf(390), "Mobile");
  assert.equal(deviceOf(NaN), "Unknown");
  assert.ok(hostAllowed("www.site.org", ["site.org"]));
  assert.ok(hostAllowed("preview.site.org", ["site.org"]));
  assert.ok(!hostAllowed("notsite.org", ["site.org"]));
  assert.equal(cleanPath("/a%20b/"), "/a b");
  assert.equal(cleanPath("/"), "/");
  assert.deepEqual(parseDomains("https://www.Site.org/, other.site.org  site.org, not a domain"), ["site.org", "other.site.org"]);
});
