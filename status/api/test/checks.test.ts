// The check runner, against a real local server rather than a mocked fetch: timeouts, slow
// responses and dropped connections are exactly the cases a mock gets wrong.
import { strict as assert } from "node:assert";
import { createServer, type Server } from "node:http";
import test, { after } from "node:test";
import { defaultCheck, runCheck } from "../src/checks.js";
import { renderBadge } from "../src/badge.js";
import { at, safeColour, esc, normaliseHost, isSlug } from "../src/util.js";

const servers: Server[] = [];
after(() => servers.forEach((s) => s.close()));

/** A server whose handler the test controls, returning its base URL. */
async function serve(handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void): Promise<string> {
  const s = createServer(handler);
  servers.push(s);
  s.listen(0);
  await new Promise((r) => s.once("listening", r));
  return `http://127.0.0.1:${(s.address() as { port: number }).port}`;
}

const check = (url: string, over = {}) => ({ ...defaultCheck(url), ...over });

test("a healthy endpoint is up", async () => {
  const base = await serve((_q, res) => res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}'));
  const p = await runCheck(check(base));
  assert.equal(p.state, "up");
  assert.equal(p.status, 200);
});

test("an unexpected status is down, and says what it got", async () => {
  const base = await serve((_q, res) => res.writeHead(503).end("nope"));
  const p = await runCheck(check(base));
  assert.equal(p.state, "down");
  assert.equal(p.status, 503);
  assert.match(p.error!, /expected 200, got 503/);
});

test("expectStatus can allow more than one code", async () => {
  const base = await serve((_q, res) => res.writeHead(204).end());
  assert.equal((await runCheck(check(base, { expectStatus: [200, 204] }))).state, "up");
  assert.equal((await runCheck(check(base, { expectStatus: [200] }))).state, "down");
});

test("a slow but successful response is degraded, not down", async () => {
  const base = await serve((_q, res) => setTimeout(() => res.writeHead(200).end("ok"), 120));
  const p = await runCheck(check(base, { degradedMs: 50 }));
  assert.equal(p.state, "degraded");
  assert.match(p.error!, /slow above 50ms/);
});

test("degradedMs of 0 switches the slow check off", async () => {
  const base = await serve((_q, res) => setTimeout(() => res.writeHead(200).end("ok"), 60));
  assert.equal((await runCheck(check(base, { degradedMs: 0 }))).state, "up");
});

test("no response within the timeout is down", async () => {
  const base = await serve(() => { /* never answers */ });
  const p = await runCheck(check(base, { timeoutMs: 150 }));
  assert.equal(p.state, "down");
  assert.match(p.error!, /no response within 150ms/);
});

test("a refused connection is down rather than an exception", async () => {
  // Port 1 is reserved and nothing listens on it.
  const p = await runCheck(check("http://127.0.0.1:1/", { timeoutMs: 1000 }));
  assert.equal(p.state, "down");
  assert.ok(p.error);
});

test("an assertion turns a ping into a real check", async () => {
  const base = await serve((_q, res) =>
    res.writeHead(200, { "content-type": "application/json" }).end('{"ok":false,"database":{"reachable":false}}'));

  // 200 OK, so a plain ping would call this up. The assertion is what catches it.
  assert.equal((await runCheck(check(base))).state, "up");

  const asserted = await runCheck(check(base, { assert: { path: "ok", equals: true } }));
  assert.equal(asserted.state, "down");
  assert.match(asserted.error!, /ok was false, expected true/);

  const nested = await runCheck(check(base, { assert: { path: "database.reachable", equals: true } }));
  assert.equal(nested.state, "down");
});

test("an assertion against a non-JSON body fails rather than passing quietly", async () => {
  const base = await serve((_q, res) => res.writeHead(200).end("<html>fine</html>"));
  const p = await runCheck(check(base, { assert: { path: "ok", equals: true } }));
  assert.equal(p.state, "down");
  assert.match(p.error!, /not JSON/);
});

/* ---------------- small pieces that guard the page ---------------- */

test("the accent colour is allowlisted, because it reaches a style attribute", () => {
  assert.equal(safeColour("#0f766e"), "#0f766e");
  assert.equal(safeColour("rebeccapurple"), "rebeccapurple");
  assert.equal(safeColour("#abc"), "#abc");
  assert.equal(safeColour("red; } body { display: none"), "#0f766e");
  assert.equal(safeColour("url(javascript:alert(1))"), "#0f766e");
  assert.equal(safeColour(""), "#0f766e");
});

test("text interpolated into the page is escaped", () => {
  assert.equal(esc('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  assert.equal(esc(null), "");
});

test("a badge escapes its label rather than breaking the SVG", () => {
  const svg = renderBadge('<script>&"', "down");
  assert.equal(svg.includes("<script>"), false);
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /aria-label=/);
  assert.match(svg, /down/);
});

test("hosts are compared without port or case", () => {
  assert.equal(normaliseHost("Status.Example.ORG:8443"), "status.example.org");
  assert.equal(normaliseHost("status.example.org."), "status.example.org");
});

test("tenant ids are slugs", () => {
  assert.equal(isSlug("itc"), true);
  assert.equal(isSlug("my-status-page"), true);
  assert.equal(isSlug("-nope"), false);
  assert.equal(isSlug("Nope"), false);
  assert.equal(isSlug("a/b"), false);
});

test("dotted paths read missing branches without throwing", () => {
  assert.equal(at({ a: { b: 1 } }, "a.b"), 1);
  assert.equal(at({ a: null }, "a.b.c"), undefined);
  assert.equal(at(undefined, "a"), undefined);
});
