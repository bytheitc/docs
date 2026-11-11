// Fixture-based tests of provider sync mapping, account matching and milestones. No network calls:
// every adapter gets a fake fetch that serves fixtures and fails on anything unexpected.
// Run: npm test   (node --import ./scripts/ts-hooks.mjs scripts/test-sync.ts)
import { readFileSync } from "node:fs";
import { github, mapSearchItem, searchQuery } from "../lib/providers/github";
import { mapGitlabItem } from "../lib/providers/gitlab";
import { mapForgejoIssue } from "../lib/providers/codeberg";
import { mapHubCommits } from "../lib/providers/huggingface";
import { mapOrcidWorks } from "../lib/providers/orcid";
import { mapWikiRevisions } from "../lib/providers/wikimedia";
import { mapCrowdinReport } from "../lib/providers/crowdin";
import { matcher } from "../lib/portal/match";
import { evaluateMilestones } from "../lib/portal/milestones";
import type { TrackedSource } from "../lib/providers/types";

const fx = (n: string) => JSON.parse(readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8"));
let failed = 0, passed = 0;
const check = (name: string, ok: boolean, extra = "") => {
  ok ? passed++ : failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  — ${extra}` : ""}`);
};

const source: TrackedSource = { id: "github-oss", label: "OSS", provider: "github", owner: "itc-oss", house: "oss", active: true };

// ---- GitHub: query building
check("github query: org + is:pr", searchQuery(source, "pr", null) === "org:itc-oss is:pr");
check("github query: repo + since", searchQuery({ owner: "itc-oss", repo: "hijri-kit" }, "issue", new Date("2026-10-01T05:00:00Z")) === "repo:itc-oss/hijri-kit is:issue updated:>=2026-10-01");
let threw = false;
try { searchQuery({ owner: "itc-oss org:evil" }, "pr", null); } catch { threw = true; }
check("github query: rejects qualifier injection in owner", threw);

// ---- GitHub: full sync() with a fake fetch serving fixture JSON
const calls: { url: string; auth?: string }[] = [];
const fakeFetch = async (url: string, init?: RequestInit) => {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  calls.push({ url, auth: headers.Authorization });
  const u = new URL(url);
  if (u.host !== "api.github.com" || u.pathname !== "/search/issues") throw new Error(`unexpected fetch ${url}`);
  const q = u.searchParams.get("q") ?? "";
  const body = q.includes("is:pr") ? fx("github-search-prs.json") : fx("github-search-issues.json");
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
};
const since = new Date("2026-09-01T00:00:00Z");
const items = await github.sync!(source, since, { fetch: fakeFetch, env: { GITHUB_SYNC_TOKEN: "test-token" }, linkedAccounts: [] });
check("github sync: one request per query (stops at total_count)", calls.length === 2, `calls=${calls.length}`);
check("github sync: uses org-level token from env", calls.every((c) => c.auth === "Bearer test-token"));
check("github sync: passes since as updated qualifier", calls.every((c) => decodeURIComponent(c.url).includes("updated:>=2026-09-01")));
check("github sync: drops non-http URLs and null users", items.length === 4, `items=${items.length}`);
const byId = new Map(items.map((i) => [i.providerContributionId, i]));
const merged = byId.get("2001");
check("github map: merged PR → kind pr, state merged", merged?.kind === "pr" && merged.state === "merged");
check("github map: occurredAt = merged_at for merged PR", merged?.occurredAt.toISOString() === "2026-09-03T09:00:00.000Z");
check("github map: repo from repository_url", merged?.repo === "itc-oss/hijri-kit");
check("github map: author id + login", merged?.author.id === "501" && merged.author.username === "amina-dev");
check("github map: house from source", items.every((i) => i.house === "oss"));
check("github map: open PR → open", byId.get("2002")?.state === "open");
check("github map: HTML stripped from titles", byId.get("2002")?.title === "Fix RTL layout in alert(1)docs", JSON.stringify(byId.get("2002")?.title));
check("github map: closed unmerged PR → closed", byId.get("2003")?.state === "closed");
check("github map: issue → kind issue, state open", byId.get("3001")?.kind === "issue" && byId.get("3001")?.state === "open");
check("github map: javascript: URL rejected", mapSearchItem(fx("github-search-prs.json").items[3], "oss") === null);

// ---- Matching: by id, then case-insensitive username; unmatched stays null
const match = matcher([
  { provider: "github", providerUserId: "501", username: "amina-dev", contributorId: "c-amina" },
  { provider: "wikimedia", providerUserId: "99", username: "Yusuf K", contributorId: "c-yusuf" },
]);
check("match: github by provider user id", match(merged!.author, "github") === "c-amina");
check("match: unmatched author → null (kept for later)", match(byId.get("2002")!.author, "github") === null);
check("match: wikimedia by username, case-insensitive", match({ username: "yusuf k" }, "wikimedia") === "c-yusuf");
check("match: never across providers", match({ id: "501" }, "gitlab") === null);

// ---- Other adapters (mapping only; live APIs untested)
const gl = mapGitlabItem({ id: 7, iid: 3, title: "Add RTL", web_url: "https://gitlab.com/itc/app/-/merge_requests/3", state: "merged", created_at: "2026-01-01T00:00:00Z", merged_at: "2026-01-02T00:00:00Z", author: { id: 42, username: "sara" }, references: { full: "itc/app!3" } }, "mr", "engineering");
check("gitlab map: merged MR", gl?.kind === "merge-request" && gl.state === "merged" && gl.repo === "itc/app" && gl.providerContributionId === "mr:7");
const fj = mapForgejoIssue({ id: 5, number: 2, title: "Fix", html_url: "https://codeberg.org/itc/x/pulls/2", state: "closed", created_at: "2026-01-01T00:00:00Z", user: { id: 3, login: "bilal" }, repository: { full_name: "itc/x" }, pull_request: { merged: true, merged_at: "2026-01-03T00:00:00Z" } }, "oss");
check("forgejo map: merged PR", fj?.kind === "pr" && fj.state === "merged" && fj.repo === "itc/x");
const hf = mapHubCommits("model", "itc-ai/tafsir-small", [
  { id: "c2", title: "Update card", date: "2026-03-02T00:00:00Z", authors: [{ user: "maryam" }] },
  { id: "c1", title: "Initial", date: "2026-03-01T00:00:00Z", authors: [{ user: "maryam" }, { user: "omar" }] },
], "ai", null);
check("huggingface map: one record per author, latest commit", hf.length === 2 && hf.find((h) => h.author.username === "maryam")?.title.endsWith("Update card") === true);
const oc = mapOrcidWorks("0000-0002-1825-0097", { group: [{ "work-summary": [{ "put-code": 11, title: { title: { value: "Isnad and provenance" } }, type: "journal-article", "publication-date": { year: { value: "2025" }, month: { value: "06" } }, "external-ids": { "external-id": [{ "external-id-type": "doi", "external-id-value": "10.1234/abc" }] } }] }] }, "research", null);
check("orcid map: work with DOI link", oc.length === 1 && oc[0].url === "https://doi.org/10.1234/abc" && oc[0].kind === "work" && oc[0].author.id === "0000-0002-1825-0097");
const wk = mapWikiRevisions("en.wikipedia.org", { query: { pages: [{ title: "Islamic geometric patterns", revisions: [{ revid: 100, user: "Yusuf K", timestamp: "2026-04-01T00:00:00Z", comment: "cite" }, { revid: 101, timestamp: "2026-04-02T00:00:00Z" }] }] } }, "institute");
check("wikimedia map: edits, hidden users skipped", wk.length === 1 && wk[0].kind === "edit" && wk[0].url.includes("diff=100"));
const cr = mapCrowdinReport("itc-site", "2026-11", { data: [{ user: { id: 8, username: "hana" }, languages: [{ id: "ar", name: "Arabic" }], translated: 120, approved: 0 }, { user: { id: 9, username: "idle" }, translated: 0, approved: 0 }] }, "site", new Date("2026-11-09T00:00:00Z"));
check("crowdin map: per member, zero-work members skipped", cr.length === 1 && cr[0].kind === "translation" && cr[0].title.includes("Arabic"));

// ---- Milestones: private, from own work only
const base = { provider: "github", providerContributionId: "", title: "", url: "", contributorId: "c", createdAt: new Date(), updatedAt: new Date() } as const;
const mine = [
  { ...base, id: "1", kind: "pr", state: "merged", house: "oss", occurredAt: new Date("2026-01-01") },
  { ...base, id: "2", kind: "issue", state: "open", house: "engineering", occurredAt: new Date("2026-02-01") },
  { ...base, id: "3", provider: "self", kind: "design", state: "published", house: "site", occurredAt: new Date("2026-03-01"), review: { status: "pending" } },
  { ...base, id: "4", provider: "self", kind: "writing", state: "published", house: "research", occurredAt: new Date("2026-04-01"), review: { status: "verified" } },
] as never[];
const { reached } = evaluateMilestones([
  { id: "first", title: "", description: "", rule: "contributions", threshold: 1 },
  { id: "merged", title: "", description: "", rule: "merged", threshold: 1 },
  { id: "houses3", title: "", description: "", rule: "houses", threshold: 3 },
  { id: "houses4", title: "", description: "", rule: "houses", threshold: 4 },
  { id: "self", title: "", description: "", rule: "verified-self", threshold: 1 },
], mine);
const got = reached.map((r) => r.def.id).sort().join(",");
check("milestones: reached set ignores pending self-logs", got === "first,houses3,merged,self", got);

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
