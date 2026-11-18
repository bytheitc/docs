import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { loadConfig } from "../src/config.js";
import { buildBoardFromIssues, type GithubIssue } from "../src/firstHundredBoard.js";
import { firstHundredRoutes } from "../src/routes/firstHundred.js";

const issue = (n: number, extra: Partial<GithubIssue> = {}): GithubIssue => ({
  number: n,
  title: `Task ${n}`,
  html_url: `https://github.com/bytheitc/hifz/issues/${n}`,
  state: "open",
  repository_url: "https://api.github.com/repos/bytheitc/hifz",
  labels: [{ name: "first-hundred" }, { name: "track:code" }],
  ...extra,
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function serve(fetchImpl: typeof fetch) {
  const config = loadConfig({ NODE_ENV: "test", PORTAL_API_URL: "http://portal.test" } as NodeJS.ProcessEnv);
  const app = express().use(firstHundredRoutes({ config }, fetchImpl));
  const server = app.listen(0);
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/first-hundred`;
  return { url, close: () => server.close() };
}

test("a board built from GitHub alone counts done and open, drops not-planned, and claims nothing", () => {
  const board = buildBoardFromIssues([
    issue(1),
    issue(2, { state: "closed", state_reason: "completed" }),
    issue(3, { state: "closed", state_reason: "not_planned" }),
    issue(4, { pull_request: {} }),
  ]);
  assert.equal(board.total, 2);
  assert.equal(board.done, 1);
  assert.equal(board.open, 1);
  assert.equal(board.claimed, 0);
  assert.equal(board.claimsUnknown, true);
  assert.deepEqual(board.projects, [{ repo: "bytheitc/hifz", total: 2, done: 1 }]);
});

test("passes the portal's board through when the portal answers", async () => {
  const fromPortal = { goal: 100, total: 1, done: 0, claimed: 1, open: 0, tracks: [], projects: [], tasks: [], updatedAt: "x" };
  const s = await serve((async (u: string) => (String(u).startsWith("http://portal.test") ? json(fromPortal) : json({}, 500))) as typeof fetch);
  try {
    const body = (await (await fetch(s.url)).json()) as Record<string, unknown>;
    assert.equal(body.claimed, 1);
    assert.equal(body.claimsUnknown, undefined);
  } finally {
    s.close();
  }
});

test("builds the board from GitHub when the portal is down, instead of failing the page", async () => {
  const s = await serve((async (u: string) => {
    if (String(u).startsWith("http://portal.test")) throw new Error("connect ECONNREFUSED");
    return json({ total_count: 2, items: [issue(1), issue(2, { state: "closed", state_reason: "completed" })] });
  }) as typeof fetch);
  try {
    const res = await fetch(s.url);
    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.total, 2);
    assert.equal(body.claimsUnknown, true);
  } finally {
    s.close();
  }
});

test("answers 503 only when the portal and GitHub both fail", async () => {
  const s = await serve((async (u: string) => (String(u).startsWith("http://portal.test") ? json({}, 503) : json({ message: "rate limited" }, 403))) as typeof fetch);
  try {
    assert.equal((await fetch(s.url)).status, 503);
  } finally {
    s.close();
  }
});
