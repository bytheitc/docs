// GitHub: OAuth app sign-in (no scopes = public identity only) and sync via the REST search API.
// Sync uses an org-level token from GITHUB_SYNC_TOKEN (a fine-grained token with read-only access, or a GitHub App
// installation token). Without it, sync still works on public repos at the unauthenticated rate limit.
import {
  getJson, optStr, plain, ProviderError, safeUrl, str,
  type ContributionState, type FetchLike, type NormalisedContribution, type ProviderAdapter, type TrackedSource,
} from "./types.js";

const API = "https://api.github.com";

interface SearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  created_at: string;
  closed_at: string | null;
  repository_url: string;
  user: { id: number; login: string } | null;
  pull_request?: { merged_at: string | null; html_url?: string };
}

interface SearchPage {
  total_count: number;
  incomplete_results: boolean;
  items: SearchItem[];
}

const SAFE_NAME = /^[A-Za-z0-9_.-]{1,100}$/;

/** Builds the search qualifiers for a tracked source. Exported for tests. */
export function searchQuery(source: Pick<TrackedSource, "owner" | "repo">, type: "pr" | "issue", since: Date | null): string {
  const owner = source.owner.trim();
  const repo = source.repo?.trim();
  if (!SAFE_NAME.test(owner) || (repo && !SAFE_NAME.test(repo))) throw new ProviderError(`Invalid GitHub owner or repo: ${owner}/${repo ?? ""}`);
  const parts = [repo ? `repo:${owner}/${repo}` : `org:${owner}`, `is:${type}`];
  if (since) parts.push(`updated:>=${since.toISOString().slice(0, 10)}`);
  return parts.join(" ");
}

/** Maps one search result to a normalised contribution. Exported for fixture tests. */
export function mapSearchItem(item: SearchItem, house: TrackedSource["house"]): NormalisedContribution | null {
  const url = safeUrl(item.html_url);
  if (!url || !item.user) return null;
  const isPr = !!item.pull_request;
  const mergedAt = item.pull_request?.merged_at ?? null;
  const state: ContributionState = isPr && mergedAt ? "merged" : item.state === "open" ? "open" : "closed";
  // "owner/name" from https://api.github.com/repos/owner/name
  const repo = str(item.repository_url).split("/repos/")[1] ?? "";
  return {
    provider: "github",
    providerContributionId: String(item.id),
    kind: isPr ? "pr" : "issue",
    title: plain(item.title) || `#${item.number}`,
    url,
    repo: repo || undefined,
    state,
    author: { id: String(item.user.id), username: item.user.login },
    occurredAt: new Date(mergedAt ?? item.created_at),
    house,
  };
}

async function searchAll(fetch: FetchLike, q: string, token: string | undefined): Promise<SearchItem[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const out: SearchItem[] = [];
  // The search API returns at most 1,000 results per query (10 pages of 100).
  for (let page = 1; page <= 10; page++) {
    const url = `${API}/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=100&page=${page}`;
    const data = await getJson<SearchPage>(fetch, url, headers);
    out.push(...data.items);
    if (data.items.length < 100 || out.length >= data.total_count) break;
  }
  return out;
}

export const github: ProviderAdapter = {
  id: "github",
  name: "GitHub",
  category: "code",
  blurb: "Pull requests and issues in the Collective’s repositories.",
  envVars: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  syncEnvVars: ["GITHUB_SYNC_TOKEN", "GITHUB_ISSUES_TOKEN"],
  setup: [
    "GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.",
    "Authorization callback URL: {callback}",
    "Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET. No scopes are requested: sign-in reads public identity only.",
    "For sync, set GITHUB_SYNC_TOKEN: a fine-grained token (or GitHub App installation token) with read-only access to the tracked repositories’ issues and pull requests.",
    "Optional: GITHUB_ISSUES_TOKEN with Issues: read and write, so claims assign the issue on GitHub.",
  ],
  tested: "Sync mapping tested with fixture JSON. OAuth and live API calls not exercised in tests.",

  oauth(env) {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return null;
    return {
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      scopes: [],
      pkce: true,
      tokenAuth: "body",
      extraAuthorizeParams: { allow_signup: "true" },
    };
  },

  async profile(token, { fetch }) {
    const u = await getJson<Record<string, unknown>>(fetch, `${API}/user`, { Authorization: `Bearer ${str(token.access_token)}` });
    const login = str(u.login);
    if (!u.id || !login) throw new ProviderError("GitHub did not return a user.");
    return {
      providerUserId: String(u.id),
      username: login,
      displayName: plain(u.name, 120) || login,
      avatarUrl: safeUrl(u.avatar_url),
      profileUrl: safeUrl(u.html_url) ?? `https://github.com/${login}`,
    };
  },

  async sync(source, since, ctx) {
    const token = optStr(ctx.env.GITHUB_SYNC_TOKEN);
    const items = [
      ...(await searchAll(ctx.fetch, searchQuery(source, "pr", since), token)),
      ...(await searchAll(ctx.fetch, searchQuery(source, "issue", since), token)),
    ];
    return items.map((i) => mapSearchItem(i, source.house)).filter((c): c is NormalisedContribution => !!c);
  },
};

/** Comments on an issue as the token's owner, if GITHUB_ISSUES_TOKEN is set. Returns false when not configured. */
export async function commentGithubIssue(
  fetch: FetchLike, env: Record<string, string | undefined>, repo: string, issue: number, body: string,
): Promise<boolean> {
  const token = env.GITHUB_ISSUES_TOKEN;
  if (!token) return false;
  const res = await fetch(`${API}/repos/${repo}/issues/${issue}/comments`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "itc-portal" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new ProviderError(`GitHub refused the comment (${res.status}).`);
  return true;
}

/** Assigns an issue to a GitHub user, if GITHUB_ISSUES_TOKEN is set. Returns false when not configured. */
export async function assignGithubIssue(
  fetch: FetchLike, env: Record<string, string | undefined>, repo: string, issue: number, login: string,
): Promise<boolean> {
  const token = env.GITHUB_ISSUES_TOKEN;
  if (!token) return false;
  const res = await fetch(`${API}/repos/${repo}/issues/${issue}/assignees`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "itc-portal" },
    body: JSON.stringify({ assignees: [login] }),
  });
  if (!res.ok) throw new ProviderError(`GitHub refused the assignment (${res.status}).`);
  return true;
}
