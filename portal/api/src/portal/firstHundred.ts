// The First Hundred: the launch board. Its tasks are GitHub issues labelled `first-hundred` across the
// collective's repositories, so maintainers manage them where they already work. A task is:
//   open      nobody holds a claim on it
//   claimed   someone holds an active portal claim (the existing claim flow, /claim on the portal)
//   done      the issue was closed as completed; closed as "not planned" drops it from the board
//
// The track comes from a `track:<name>` label (code, docs, design, accessibility, tests, writing).
// No names appear on the board: who did a task is on GitHub for anyone who looks, and on the portal
// only for people who chose a public profile.
import type { Claim } from "./types.js";

export const LABEL = "first-hundred";
export const GOAL = 100;
const TRACKS = ["code", "tests", "docs", "design", "accessibility", "writing"] as const;
export type Track = (typeof TRACKS)[number] | "other";
export type TaskState = "open" | "claimed" | "done";

export interface GithubIssue {
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  state_reason?: string | null;
  repository_url: string;
  labels?: ({ name?: string } | string)[];
  pull_request?: unknown;
}

export interface Task {
  repo: string;
  number: number;
  title: string;
  url: string;
  track: Track;
  state: TaskState;
  /** Where to claim it, on the portal. Absent once it's claimed or done. */
  claimUrl?: string;
}

export interface Board {
  goal: number;
  total: number;
  done: number;
  claimed: number;
  open: number;
  tracks: { track: Track; total: number; done: number }[];
  /** Per repository, in the order they first appear among open tasks. */
  projects: { repo: string; total: number; done: number }[];
  tasks: Task[];
  updatedAt: string;
  /** Set when GitHub could not be reached and this is the last board that could be built. */
  stale?: boolean;
}

const labelNames = (i: GithubIssue) => (i.labels ?? []).map((l) => (typeof l === "string" ? l : l.name ?? "").toLowerCase());
const repoOf = (i: GithubIssue) => i.repository_url.replace(/^https:\/\/api\.github\.com\/repos\//, "");

export function trackOf(i: GithubIssue): Track {
  for (const l of labelNames(i)) {
    const t = l.startsWith("track:") ? l.slice(6).trim() : "";
    if ((TRACKS as readonly string[]).includes(t)) return t as Track;
  }
  return "other";
}

export function buildBoard(issues: GithubIssue[], claims: Claim[], portalUrl: string, now = new Date()): Board {
  const held = new Set(claims.filter((c) => (c.status === "active" || c.status === "requested") && c.provider === "github").map((c) => `${c.repo.toLowerCase()}#${c.issue}`));
  const order: Record<TaskState, number> = { open: 0, claimed: 1, done: 2 };
  const tasks: Task[] = issues
    .filter((i) => !i.pull_request && !(i.state === "closed" && i.state_reason === "not_planned"))
    .map((i) => {
      const repo = repoOf(i);
      const state: TaskState = i.state === "closed" ? "done" : held.has(`${repo.toLowerCase()}#${i.number}`) ? "claimed" : "open";
      return {
        repo, number: i.number, title: i.title.slice(0, 200), url: i.html_url, track: trackOf(i), state,
        ...(state === "open" ? { claimUrl: `${portalUrl}/claim?provider=github&repo=${encodeURIComponent(repo)}&issue=${i.number}` } : {}),
      };
    })
    .sort((a, b) => order[a.state] - order[b.state] || a.repo.localeCompare(b.repo) || a.number - b.number);

  const tracks = [...TRACKS, "other" as const]
    .map((track) => ({ track, total: tasks.filter((t) => t.track === track).length, done: tasks.filter((t) => t.track === track && t.state === "done").length }))
    .filter((t) => t.total > 0);
  const projects = [...new Set(tasks.map((t) => t.repo))]
    .map((repo) => ({ repo, total: tasks.filter((t) => t.repo === repo).length, done: tasks.filter((t) => t.repo === repo && t.state === "done").length }));
  const n = (s: TaskState) => tasks.filter((t) => t.state === s).length;
  return { goal: GOAL, total: tasks.length, done: n("done"), claimed: n("claimed"), open: n("open"), tracks, projects, tasks, updatedAt: now.toISOString() };
}

/** Every issue carrying the label in the org, open and closed, at most 300. */
export async function fetchIssues(org: string, token: string | undefined, fetchImpl: typeof fetch = fetch): Promise<GithubIssue[]> {
  const q = encodeURIComponent(`org:${org} label:${LABEL} is:issue`);
  const out: GithubIssue[] = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetchImpl(`https://api.github.com/search/issues?q=${q}&per_page=100&page=${page}`, {
      headers: { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "itc-portal", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`GitHub search answered HTTP ${res.status}`);
    const body = (await res.json()) as { items?: GithubIssue[]; total_count?: number };
    out.push(...(body.items ?? []));
    if (!body.items?.length || out.length >= (body.total_count ?? 0)) break;
  }
  return out;
}
