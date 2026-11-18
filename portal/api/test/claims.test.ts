// Handing back your own claim. No database and no clock: a fake store.
import { strict as assert } from "node:assert";
import test from "node:test";
import { releaseOwnClaim } from "../src/portal/claims.js";
import type { AuditEvent, Claim, ClaimStatus, PortalStore } from "../src/portal/types.js";

const ME = { id: "c-me", handle: "me" };
const THEM = { id: "c-them", handle: "them" };

function claim(over: Partial<Claim> = {}): Claim {
  return {
    id: "claim-1",
    provider: "github",
    repo: "bytheitc/portal",
    issue: 12,
    contributorId: ME.id,
    username: "me",
    status: "active",
    createdAt: new Date("2026-11-01T00:00:00Z"),
    expiresAt: new Date("2026-11-08T00:00:00Z"),
    assigned: false,
    ...over,
  };
}

function fakeStore(seed: Claim[], opts: { releaseReturnsNull?: boolean } = {}) {
  const claims = seed.map((c) => ({ ...c }));
  const audit: AuditEvent[] = [];
  const store = {
    async listClaims(o: { contributorId?: string; status?: ClaimStatus } = {}) {
      return claims.filter(
        (c) =>
          (o.contributorId === undefined || c.contributorId === o.contributorId) &&
          (o.status === undefined || c.status === o.status),
      );
    },
    async releaseClaim(id: string, by: string) {
      if (opts.releaseReturnsNull) return null;
      const c = claims.find((x) => x.id === id && (x.status === "active" || x.status === "requested"));
      if (!c) return null;
      c.status = "released";
      c.releasedBy = by;
      c.releasedAt = new Date();
      return { ...c };
    },
    async addAudit(ev: AuditEvent) {
      audit.push(ev);
    },
  } as unknown as PortalStore;
  return { store, claims, audit };
}

test("releases a claim you hold, and records who did it", async () => {
  const { store, claims, audit } = fakeStore([claim()]);

  const result = await releaseOwnClaim(store, ME, "claim-1");

  assert.equal(result.ok, true);
  assert.equal(claims[0].status, "released");
  assert.equal(claims[0].releasedBy, "me");
  assert.equal(audit.length, 1);
  assert.equal(audit[0].action, "portal.claim.release");
  assert.equal(audit[0].actor, "me");
  assert.equal(audit[0].target, "claim/github:bytheitc/portal#12");
});

test("will not release someone else's claim, and does not admit it exists", async () => {
  const { store, claims, audit } = fakeStore([claim({ contributorId: THEM.id, username: "them" })]);

  const result = await releaseOwnClaim(store, ME, "claim-1");

  // "not-found", never "forbidden": a stranger must not learn which claim ids are real.
  assert.deepEqual(result, { ok: false, reason: "not-found" });
  assert.equal(claims[0].status, "active", "their claim is untouched");
  assert.equal(audit.length, 0, "a refused release is not an event");
});

test("an id that does not exist is the same answer as someone else's", async () => {
  const { store } = fakeStore([claim()]);
  assert.deepEqual(await releaseOwnClaim(store, ME, "no-such-claim"), { ok: false, reason: "not-found" });
});

test("a claim that is already released cannot be released again", async () => {
  const { store, audit } = fakeStore([claim({ status: "released" })]);

  // It is not in the active list, so it never reaches the write.
  assert.deepEqual(await releaseOwnClaim(store, ME, "claim-1"), { ok: false, reason: "not-found" });
  assert.equal(audit.length, 0);
});

test("losing the race to an expiry sweep is reported, not swallowed", async () => {
  // The claim is active when read and gone by the time the write lands — what the sweeper does.
  const { store, audit } = fakeStore([claim()], { releaseReturnsNull: true });

  assert.deepEqual(await releaseOwnClaim(store, ME, "claim-1"), { ok: false, reason: "no-longer-active" });
  assert.equal(audit.length, 0, "nothing was released, so nothing is recorded");
});

test("only the matching claim is released when you hold several", async () => {
  const { store, claims, audit } = fakeStore([
    claim({ id: "claim-1", issue: 12 }),
    claim({ id: "claim-2", issue: 34 }),
  ]);

  const result = await releaseOwnClaim(store, ME, "claim-2");

  assert.equal(result.ok, true);
  assert.equal(claims[0].status, "active");
  assert.equal(claims[1].status, "released");
  assert.equal(audit[0].target, "claim/github:bytheitc/portal#34");
});

/* ---------------- asking, and a maintainer's answer ---------------- */

import { decideRequest, isEstablished } from "../src/portal/claims.js";

function decisionStore(seed: Claim[], opts: { merged?: boolean; role?: "maintainer" | "reviewer" | null } = {}) {
  const claims = seed.map((c) => ({ ...c }));
  const audit: AuditEvent[] = [];
  const store = {
    async listClaims(o: { status?: ClaimStatus } = {}) {
      return claims.filter((c) => o.status === undefined || c.status === o.status);
    },
    async approveClaim(id: string, by: string, expiresAt: Date) {
      const c = claims.find((x) => x.id === id && x.status === "requested");
      if (!c) return null;
      Object.assign(c, { status: "active", approvedBy: by, expiresAt });
      return { ...c };
    },
    async declineClaim(id: string, by: string) {
      const c = claims.find((x) => x.id === id && x.status === "requested");
      if (!c) return null;
      Object.assign(c, { status: "declined", releasedBy: by });
      return { ...c };
    },
    async listMaintainerships() {
      return opts.role ? [{ role: opts.role }] : [];
    },
    async listContributions() {
      return opts.merged ? [{ state: "merged" }] : [{ state: "open" }];
    },
    async addAudit(ev: AuditEvent) {
      audit.push(ev);
    },
  } as unknown as PortalStore;
  return { store, claims, audit };
}

test("a newcomer asks; merged work or a maintainer role claims outright", async () => {
  assert.equal(await isEstablished(decisionStore([]).store, ME.id), false);
  assert.equal(await isEstablished(decisionStore([], { merged: true }).store, ME.id), true);
  assert.equal(await isEstablished(decisionStore([], { role: "reviewer" }).store, ME.id), true);
});

test("approving a request makes it an active claim for a fresh claim period, and records who approved", async () => {
  const { store, claims, audit } = decisionStore([claim({ status: "requested" })]);
  const now = new Date("2026-11-20T00:00:00Z");
  const result = await decideRequest(store, THEM, "claim-1", "approve", 7, now);
  assert.equal(result.ok, true);
  assert.equal(claims[0].status, "active");
  assert.equal(claims[0].approvedBy, "them");
  assert.equal(claims[0].expiresAt.toISOString(), "2026-11-27T00:00:00.000Z", "the clock starts at approval, not at the request");
  assert.equal(audit[0].action, "maintainers.claim.approve");
});

test("declining frees the issue; answering twice is refused", async () => {
  const { store, claims } = decisionStore([claim({ status: "requested" })]);
  assert.equal((await decideRequest(store, THEM, "claim-1", "decline", 7)).ok, true);
  assert.equal(claims[0].status, "declined");
  assert.deepEqual(await decideRequest(store, THEM, "claim-1", "approve", 7), { ok: false, reason: "not-pending" });
  assert.deepEqual(await decideRequest(store, THEM, "nope", "approve", 7), { ok: false, reason: "not-found" });
});
