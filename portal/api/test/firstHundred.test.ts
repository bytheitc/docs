// The First Hundred board: built from GitHub issues and the portal's active claims.
import { strict as assert } from "node:assert";
import test from "node:test";
import { buildBoard, trackOf, type GithubIssue } from "../src/portal/firstHundred.js";
import type { Claim } from "../src/portal/types.js";

const issue = (repo: string, number: number, o: Partial<GithubIssue> = {}): GithubIssue => ({
  number, title: `Task ${number}`, html_url: `https://github.com/${repo}/issues/${number}`, state: "open",
  repository_url: `https://api.github.com/repos/${repo}`, labels: [{ name: "first-hundred" }, { name: "track:code" }], ...o,
});
const claim = (repo: string, issueNo: number, o: Partial<Claim> = {}): Claim => ({
  id: `c${issueNo}`, provider: "github", repo, issue: issueNo, contributorId: "p1", username: "someone", status: "active",
  createdAt: new Date(), expiresAt: new Date(Date.now() + 864e5), assigned: true, ...o,
});

test("open, claimed and done come from GitHub state and active claims", () => {
  const b = buildBoard(
    [issue("bytheitc/ijaazah", 1), issue("bytheitc/ijaazah", 2), issue("bytheitc/khutbah", 3, { state: "closed", state_reason: "completed" })],
    [claim("bytheitc/ijaazah", 2), claim("bytheitc/ijaazah", 1, { status: "expired" })],
    "https://portal.example",
  );
  assert.deepEqual([b.open, b.claimed, b.done, b.total], [1, 1, 1, 3]);
  assert.equal(b.tasks.find((t) => t.number === 1)?.claimUrl, "https://portal.example/claim?provider=github&repo=bytheitc%2Fijaazah&issue=1");
  assert.equal(b.tasks.find((t) => t.number === 2)?.claimUrl, undefined, "a claimed task offers no claim link");
  assert.deepEqual(b.projects, [{ repo: "bytheitc/ijaazah", total: 2, done: 0 }, { repo: "bytheitc/khutbah", total: 1, done: 1 }]);
});

test("closed as not planned leaves the board; pull requests never join it", () => {
  const b = buildBoard([issue("bytheitc/hifz", 4, { state: "closed", state_reason: "not_planned" }), issue("bytheitc/hifz", 5, { pull_request: {} })], [], "https://p");
  assert.equal(b.total, 0);
});

test("a claim matches its issue regardless of the repository name's case", () => {
  const b = buildBoard([issue("bytheitc/Hifz", 7)], [claim("bytheitc/hifz", 7)], "https://p");
  assert.equal(b.tasks[0].state, "claimed");
});

test("the track comes from a track: label, else other", () => {
  assert.equal(trackOf(issue("a/b", 1, { labels: ["track:Tests"] })), "tests");
  assert.equal(trackOf(issue("a/b", 1, { labels: [{ name: "bug" }] })), "other");
});
