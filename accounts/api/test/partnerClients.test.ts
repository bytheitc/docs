// Self-service registration's trust gate: which requests go live immediately and which wait for
// a staff reviewer. Pure functions — no database, no server.
import { strict as assert } from "node:assert";
import test from "node:test";

import { generateClientId, needsReview } from "../src/security/partnerClients.js";

test("openid + profile, public, needs no review", () => {
  assert.equal(needsReview("public", ["openid", "profile"]), false);
});

test("any sensitive scope needs review, however it's combined with others", () => {
  assert.equal(needsReview("public", ["openid", "contributions"]), true);
  assert.equal(needsReview("public", ["openid", "entitlements"]), true);
  assert.equal(needsReview("public", ["openid", "offline_access"]), true);
});

test("a confidential client always needs review, even for the mildest scopes", () => {
  assert.equal(needsReview("confidential", ["openid", "profile"]), true);
});

test("client ids are readable (from the name) but not guessable (a random suffix)", () => {
  const a = generateClientId("Amina's Reading App!!");
  const b = generateClientId("Amina's Reading App!!");
  assert.match(a, /^amina-s-reading-app-[0-9a-f]{8}$/);
  assert.notEqual(a, b, "two apps with the same name don't collide");
});

test("a client id is never empty, even for a name with nothing alphanumeric in it", () => {
  assert.match(generateClientId("🎉🎉🎉"), /^app-[0-9a-f]{8}$/);
});
