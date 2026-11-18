// The First Hundred board, built straight from GitHub. This is the fallback for when portal/api
// can't be reached: portal/api owns the board (it knows who has claimed what), but the tasks
// themselves are public GitHub issues, so the page never has to go blank because one hop is down.
// Built this way, no task shows as claimed; the page says so.
//
// Keep the shape in step with portal/api/src/portal/firstHundred.ts, which the page also renders.

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
  claimUrl?: string;
}

export interface Board {
  goal: number;
  total: number;
  done: number;
  claimed: number;
  open: number;
  tracks: { track: Track; total: number; done: number }[];
  projects: { repo: string; total: number; done: number }[];
  tasks: Task[];
  updatedAt: string;
  stale?: boolean;
  /** Built from GitHub alone: claims aren't known, so nothing shows as claimed. */
  claimsUnknown?: boolean;
}

const labelNames = (i: GithubIssue) => (i.labels ?? []).map((l) => (typeof l === "string" ? l : l.name ?? "").toLowerCase());
const repoOf = (i: GithubIssue) => i.repository_url.replace(/^https:\/\/api\.github\.com\/repos\//, "");

function trackOf(i: GithubIssue): Track {
  for (const l of labelNames(i)) {
    const t = l.startsWith("track:") ? l.slice(6).trim() : "";
    if ((TRACKS as readonly string[]).includes(t)) return t as Track;
  }
  return "other";
}

export function buildBoardFromIssues(issues: GithubIssue[], now = new Date()): Board {
  const order: Record<TaskState, number> = { open: 0, claimed: 1, done: 2 };
  const tasks: Task[] = issues
    .filter((i) => !i.pull_request && !(i.state === "closed" && i.state_reason === "not_planned"))
    .map((i): Task => ({
      repo: repoOf(i), number: i.number, title: i.title.slice(0, 200), url: i.html_url, track: trackOf(i),
      state: i.state === "closed" ? "done" : "open",
    }))
    .sort((a, b) => order[a.state] - order[b.state] || a.repo.localeCompare(b.repo) || a.number - b.number);

  const tracks = [...TRACKS, "other" as const]
    .map((track) => ({ track, total: tasks.filter((t) => t.track === track).length, done: tasks.filter((t) => t.track === track && t.state === "done").length }))
    .filter((t) => t.total > 0);
  const projects = [...new Set(tasks.map((t) => t.repo))]
    .map((repo) => ({ repo, total: tasks.filter((t) => t.repo === repo).length, done: tasks.filter((t) => t.repo === repo && t.state === "done").length }));
  const n = (s: TaskState) => tasks.filter((t) => t.state === s).length;
  return { goal: GOAL, total: tasks.length, done: n("done"), claimed: 0, open: n("open"), tracks, projects, tasks, updatedAt: now.toISOString(), claimsUnknown: true };
}

/** Every issue carrying the label in the org, open and closed, at most 300. */
export async function fetchIssues(org: string, token: string | undefined, fetchImpl: typeof fetch = fetch): Promise<GithubIssue[]> {
  const q = encodeURIComponent(`org:${org} label:${LABEL} is:issue`);
  const out: GithubIssue[] = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetchImpl(`https://api.github.com/search/issues?q=${q}&per_page=100&page=${page}`, {
      headers: { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "itc-site", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`GitHub search answered HTTP ${res.status}`);
    const body = (await res.json()) as { items?: GithubIssue[]; total_count?: number };
    out.push(...(body.items ?? []));
    if (!body.items?.length || out.length >= (body.total_count ?? 0)) break;
  }
  return out;
}
