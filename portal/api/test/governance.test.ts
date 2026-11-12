// The maintainer path, checked against the Open Source governance page it is taken from.
// No database and no clock: a fake store and an explicit `now`.
import { strict as assert } from "node:assert";
import test from "node:test";
import { carryDueNominations, retireInactive, INACTIVE_DAYS } from "../src/portal/governance.js";
import { closesAfter, maintains, isSteering, isRepo, ANY_REPO, type Maintainership, type Nomination } from "../src/portal/maintainers.js";
import type { AuditEvent, Contributor, PortalStore } from "../src/portal/types.js";

const DAY = 864e5;
const at = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY);

function fakeStore(seed: { nominations?: Nomination[]; maintainerships?: Maintainership[]; lastWork?: Record<string, Date> }) {
  const nominations = [...(seed.nominations ?? [])];
  const maintainerships = [...(seed.maintainerships ?? [])];
  const audit: AuditEvent[] = [];
  const people: Record<string, Contributor> = {};
  for (const id of new Set([...nominations.map((n) => n.candidateId), ...maintainerships.map((m) => m.contributorId)])) {
    people[id] = { id, handle: id, displayName: id, profile: {} as never, createdAt: new Date() };
  }

  const store = {
    async dueNominations(now: Date) {
      return nominations.filter((n) => n.status === "open" && n.closesAt <= now);
    },
    async updateNomination(id: string, patch: Partial<Nomination>) {
      Object.assign(nominations.find((n) => n.id === id)!, patch);
    },
    async addMaintainership(m: Maintainership) {
      maintainerships.push(m);
    },
    async staleMaintainerships(before: Date) {
      return maintainerships.filter((m) => !m.endedAt && m.role === "maintainer" && m.since <= before);
    },
    async lastContributionAt(contributorId: string, repo: string) {
      return seed.lastWork?.[`${contributorId}:${repo}`] ?? null;
    },
    async endMaintainership(id: string, patch: Partial<Maintainership>) {
      Object.assign(maintainerships.find((m) => m.id === id)!, patch);
    },
    async getContributor(id: string) {
      return people[id] ?? null;
    },
    async addAudit(ev: AuditEvent) {
      audit.push(ev);
    },
  } as unknown as PortalStore;

  return { store, nominations, maintainerships, audit };
}

const nomination = (over: Partial<Nomination> = {}): Nomination => ({
  id: "n1", repo: "itc/hijri-kit", provider: "github", candidateId: "amina", nominatedBy: "yusuf",
  issueUrl: "https://github.com/itc/hijri-kit/issues/12", reason: "Reviewed for months and fixed the leap-year table.",
  openedAt: at(8), closesAt: closesAfter(at(8)), status: "open", objections: [], ...over,
});

const maintainership = (over: Partial<Maintainership> = {}): Maintainership => ({
  id: "m1", contributorId: "yusuf", repo: "itc/hijri-kit", provider: "github",
  role: "maintainer", since: at(400), by: null, ...over,
});

/* ---------------- nominations carry by silence ---------------- */

test("a nomination nobody objected to carries once the seven days pass", async () => {
  const { store, nominations, maintainerships, audit } = fakeStore({ nominations: [nomination()] });
  assert.equal(await carryDueNominations(store, new Date()), 1);
  assert.equal(nominations[0].status, "carried");
  assert.equal(maintainerships.length, 1);
  assert.equal(maintainerships[0].contributorId, "amina");
  assert.equal(maintainerships[0].role, "maintainer");
  assert.equal(maintainerships[0].by, "yusuf", "the nominator is recorded as who brought them in");
  assert.match(audit[0].detail!, /no objection/);
});

test("a nomination still inside its window is left alone", async () => {
  const opened = at(2);
  const { store, nominations, maintainerships } = fakeStore({
    nominations: [nomination({ openedAt: opened, closesAt: closesAfter(opened) })],
  });
  assert.equal(await carryDueNominations(store, new Date()), 0);
  assert.equal(nominations[0].status, "open");
  assert.equal(maintainerships.length, 0);
});

test("one objection stops a nomination carrying, however late the sweep runs", async () => {
  const { store, nominations, maintainerships } = fakeStore({
    nominations: [nomination({ objections: [{ by: "fatima", at: at(5), note: "Let's wait for more review work." }] })],
  });
  assert.equal(await carryDueNominations(store, new Date(Date.now() + 90 * DAY)), 0);
  assert.equal(nominations[0].status, "open");
  assert.equal(maintainerships.length, 0, "an objection is answered in the issue, not by this sweep");
});

test("a withdrawn nomination never carries", async () => {
  const { store, maintainerships } = fakeStore({ nominations: [nomination({ status: "withdrawn" })] });
  assert.equal(await carryDueNominations(store, new Date()), 0);
  assert.equal(maintainerships.length, 0);
});

/* ---------------- six months of silence is emeritus ---------------- */

test("a maintainer with no work on the repo for six months is moved to emeritus", async () => {
  const { store, maintainerships, audit } = fakeStore({
    maintainerships: [maintainership()],
    lastWork: { "yusuf:itc/hijri-kit": at(INACTIVE_DAYS + 30) },
  });
  assert.equal(await retireInactive(store, new Date()), 1);
  assert.equal(maintainerships[0].endedReason, "emeritus");
  assert.match(audit[0].detail!, /with thanks/);
});

test("recent work on the repo keeps a maintainer", async () => {
  const { store, maintainerships } = fakeStore({
    maintainerships: [maintainership()],
    lastWork: { "yusuf:itc/hijri-kit": at(10) },
  });
  assert.equal(await retireInactive(store, new Date()), 0);
  assert.equal(maintainerships[0].endedAt, undefined);
});

test("work on another repo does not keep a maintainer of this one", async () => {
  const { store, maintainerships } = fakeStore({
    maintainerships: [maintainership()],
    lastWork: { "yusuf:itc/something-else": at(1) },
  });
  assert.equal(await retireInactive(store, new Date()), 1);
  assert.equal(maintainerships[0].endedReason, "emeritus");
});

test("someone newly seated is not retired before they have had six months", async () => {
  const { store, maintainerships } = fakeStore({ maintainerships: [maintainership({ since: at(5) })] });
  assert.equal(await retireInactive(store, new Date()), 0);
  assert.equal(maintainerships[0].endedAt, undefined);
});

test("a reviewer is not subject to the six-month rule", async () => {
  const { store, maintainerships } = fakeStore({ maintainerships: [maintainership({ role: "reviewer" })] });
  assert.equal(await retireInactive(store, new Date()), 0);
  assert.equal(maintainerships[0].endedAt, undefined);
});

/* ---------------- who may act ---------------- */

test("only a maintainer of that repo, or the steering group, may act on it", () => {
  const repo = "itc/hijri-kit";
  assert.equal(maintains([maintainership({ repo })], repo), true);
  assert.equal(maintains([maintainership({ repo: "itc/other" })], repo), false, "a maintainer elsewhere is not one here");
  assert.equal(maintains([maintainership({ role: "reviewer", repo })], repo), false, "reviewing is not maintaining");
  assert.equal(maintains([maintainership({ role: "steering", repo: ANY_REPO })], repo), true);
  assert.equal(maintains([maintainership({ repo, endedAt: at(1), endedReason: "emeritus" })], repo), false, "emeritus no longer acts");
});

test("steering is collective-wide, not per repo", () => {
  assert.equal(isSteering([maintainership({ role: "steering", repo: ANY_REPO })]), true);
  assert.equal(isSteering([maintainership({ role: "steering", repo: "itc/hijri-kit" })]), false);
  assert.equal(isSteering([maintainership()]), false);
});

test("repository names are owner/name", () => {
  assert.equal(isRepo("itc/hijri-kit"), true);
  assert.equal(isRepo("hijri-kit"), false);
  assert.equal(isRepo("itc/hijri/kit"), false);
  assert.equal(isRepo(""), false);
});
