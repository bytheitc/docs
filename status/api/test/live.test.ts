// The last-known cache. This is what stands between an incident and a blank status page, so it is
// worth testing even though it is twenty lines.
import { strict as assert } from "node:assert";
import test from "node:test";
import { forget, lastKnown, remember } from "../src/live.js";
import type { PublicStatus } from "../src/types.js";

const status = (over: Partial<PublicStatus> = {}): PublicStatus => ({
  tenant: { id: "itc", name: "ITC", brand: { tagline: "", supportUrl: "", accent: "#0f766e", logoUrl: "" } },
  overall: "up",
  summary: "All systems operational.",
  services: [],
  incidents: [],
  updatedAt: new Date().toISOString(),
  ...over,
});

test("what comes back is marked stale, so the page can say so", () => {
  forget();
  remember("itc", status());
  const got = lastKnown("itc");
  assert.equal(got?.stale, true);
  assert.equal(got?.summary, "All systems operational.");
});

test("the remembered copy is not itself mutated", () => {
  forget();
  const original = status();
  remember("itc", original);
  lastKnown("itc");
  assert.equal(original.stale, undefined, "marking the copy stale must not mark the stored one");
});

test("tenants do not see each other's cache", () => {
  forget();
  remember("itc", status({ summary: "ITC is fine." }));
  assert.equal(lastKnown("someone-else"), null);
});

test("nothing cached means nothing returned, rather than a misleading green", () => {
  forget();
  assert.equal(lastKnown("itc"), null);
});

test("a copy older than an hour is not worth showing", () => {
  forget();
  remember("itc", status());
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + 61 * 60_000;
    assert.equal(lastKnown("itc"), null);
  } finally {
    Date.now = realNow;
  }
});
