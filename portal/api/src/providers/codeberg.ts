// Codeberg and any Forgejo / Gitea instance (same API). Self-hosted Forgejo works by setting CODEBERG_BASE_URL,
// or per source with its "API base URL" field.
// NOT TESTED against a live Forgejo instance: written from the documented Gitea/Forgejo API v1; mapping is fixture-tested.
import {
  getJson, optStr, plain, ProviderError, safeUrl, str, trimSlash,
  type ContributionState, type NormalisedContribution, type ProviderAdapter, type TrackedSource,
} from "./types.js";

interface FjIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: "open" | "closed";
  created_at: string;
  user: { id: number; login: string } | null;
  repository?: { full_name?: string };
  pull_request?: { merged: boolean; merged_at: string | null } | null;
}

const base = (env: Record<string, string | undefined>, source?: Pick<TrackedSource, "baseUrl">) =>
  trimSlash(source?.baseUrl || env.CODEBERG_BASE_URL || "https://codeberg.org");

export function mapForgejoIssue(item: FjIssue, house: TrackedSource["house"], fallbackRepo?: string): NormalisedContribution | null {
  const url = safeUrl(item.html_url);
  if (!url || !item.user) return null;
  const isPr = !!item.pull_request;
  const merged = !!item.pull_request?.merged;
  const state: ContributionState = merged ? "merged" : item.state === "open" ? "open" : "closed";
  return {
    provider: "codeberg",
    providerContributionId: String(item.id),
    kind: isPr ? "pr" : "issue",
    title: plain(item.title) || `#${item.number}`,
    url,
    repo: str(item.repository?.full_name) || fallbackRepo,
    state,
    author: { id: String(item.user.id), username: item.user.login },
    occurredAt: new Date(item.pull_request?.merged_at ?? item.created_at),
    house,
  };
}

export const codeberg: ProviderAdapter = {
  id: "codeberg",
  name: "Codeberg / Forgejo",
  category: "code",
  blurb: "Pull requests and issues on Codeberg or a self-hosted Forgejo.",
  envVars: ["CODEBERG_CLIENT_ID", "CODEBERG_CLIENT_SECRET"],
  syncEnvVars: ["CODEBERG_BASE_URL", "CODEBERG_SYNC_TOKEN"],
  setup: [
    "Codeberg (or your Forgejo) → Settings → Applications → Create a new OAuth2 application.",
    "Redirect URI: {callback}. Confidential client: yes.",
    "Set CODEBERG_CLIENT_ID and CODEBERG_CLIENT_SECRET. For self-hosted Forgejo, set CODEBERG_BASE_URL (e.g. https://git.example.org).",
    "Optional: CODEBERG_SYNC_TOKEN (read-only access token) for private repositories.",
  ],
  tested: "Mapping fixture-tested. Not tested against a live Forgejo API.",

  oauth(env) {
    if (!env.CODEBERG_CLIENT_ID || !env.CODEBERG_CLIENT_SECRET) return null;
    const b = base(env);
    return {
      authorizeUrl: `${b}/login/oauth/authorize`,
      tokenUrl: `${b}/login/oauth/access_token`,
      clientId: env.CODEBERG_CLIENT_ID,
      clientSecret: env.CODEBERG_CLIENT_SECRET,
      scopes: ["read:user"],
      pkce: true,
      tokenAuth: "body",
    };
  },

  async profile(token, { fetch, env }) {
    const u = await getJson<Record<string, unknown>>(fetch, `${base(env)}/api/v1/user`, { Authorization: `Bearer ${str(token.access_token)}` });
    const login = str(u.login);
    if (!u.id || !login) throw new ProviderError("Forgejo did not return a user.");
    return {
      providerUserId: String(u.id),
      username: login,
      displayName: plain(u.full_name, 120) || login,
      avatarUrl: safeUrl(u.avatar_url),
      profileUrl: `${base(env)}/${encodeURIComponent(login)}`,
    };
  },

  async sync(source, since, ctx) {
    const b = base(ctx.env, source);
    const token = optStr(ctx.env.CODEBERG_SYNC_TOKEN);
    const headers: Record<string, string> = token ? { Authorization: `token ${token}` } : {};
    const out: NormalisedContribution[] = [];
    for (const type of ["pulls", "issues"]) {
      for (let page = 1; page <= 20; page++) {
        const qs = new URLSearchParams({ state: "all", type, limit: "50", page: String(page) });
        if (since) qs.set("since", since.toISOString());
        const url = source.repo
          ? `${b}/api/v1/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/issues?${qs}`
          : `${b}/api/v1/repos/issues/search?owner=${encodeURIComponent(source.owner)}&${qs}`;
        const items = await getJson<FjIssue[]>(ctx.fetch, url, headers);
        for (const i of items) {
          const c = mapForgejoIssue(i, source.house, source.repo ? `${source.owner}/${source.repo}` : undefined);
          if (c) out.push(c);
        }
        if (items.length < 50) break;
      }
    }
    return out;
  },
};
