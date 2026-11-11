// GitLab (gitlab.com or self-managed): OAuth with the `read_user` scope, sync of merge requests and issues
// for a group or a single project via the REST API v4.
// NOT TESTED against a live GitLab instance: written from the documented API; the mapping is fixture-tested.
import {
  getJson, optStr, plain, ProviderError, safeUrl, str, trimSlash,
  type ContributionState, type NormalisedContribution, type ProviderAdapter, type TrackedSource,
} from "./types.js";

interface GlItem {
  id: number;
  iid: number;
  title: string;
  web_url: string;
  state: "opened" | "closed" | "merged" | "locked";
  created_at: string;
  merged_at?: string | null;
  author: { id: number; username: string } | null;
  references?: { full?: string };
}

const base = (env: Record<string, string | undefined>, source?: Pick<TrackedSource, "baseUrl">) =>
  trimSlash(source?.baseUrl || env.GITLAB_BASE_URL || "https://gitlab.com");

export function mapGitlabItem(item: GlItem, type: "mr" | "issue", house: TrackedSource["house"]): NormalisedContribution | null {
  const url = safeUrl(item.web_url);
  if (!url || !item.author) return null;
  const state: ContributionState = item.state === "merged" ? "merged" : item.state === "opened" ? "open" : "closed";
  const full = str(item.references?.full);
  return {
    provider: "gitlab",
    providerContributionId: `${type}:${item.id}`,
    kind: type === "mr" ? "merge-request" : "issue",
    title: plain(item.title) || `!${item.iid}`,
    url,
    repo: full.replace(/[!#]\d+$/, "") || undefined,
    state,
    author: { id: String(item.author.id), username: item.author.username },
    occurredAt: new Date(item.merged_at ?? item.created_at),
    house,
  };
}

export const gitlab: ProviderAdapter = {
  id: "gitlab",
  name: "GitLab",
  category: "code",
  blurb: "Merge requests and issues on GitLab, including self-managed instances.",
  envVars: ["GITLAB_CLIENT_ID", "GITLAB_CLIENT_SECRET"],
  syncEnvVars: ["GITLAB_BASE_URL", "GITLAB_SYNC_TOKEN"],
  setup: [
    "GitLab → Preferences (or Admin → Applications on self-managed) → Applications → Add new application.",
    "Redirect URI: {callback}. Scopes: read_user only. Confidential: yes.",
    "Set GITLAB_CLIENT_ID and GITLAB_CLIENT_SECRET. For a self-managed instance also set GITLAB_BASE_URL.",
    "For sync of private projects, set GITLAB_SYNC_TOKEN (a group access token with read_api). Public projects need none.",
  ],
  tested: "Mapping fixture-tested. Not tested against a live GitLab API.",

  oauth(env) {
    if (!env.GITLAB_CLIENT_ID || !env.GITLAB_CLIENT_SECRET) return null;
    const b = base(env);
    return {
      authorizeUrl: `${b}/oauth/authorize`,
      tokenUrl: `${b}/oauth/token`,
      clientId: env.GITLAB_CLIENT_ID,
      clientSecret: env.GITLAB_CLIENT_SECRET,
      scopes: ["read_user"],
      pkce: true,
      tokenAuth: "body",
    };
  },

  async profile(token, { fetch, env }) {
    const u = await getJson<Record<string, unknown>>(fetch, `${base(env)}/api/v4/user`, { Authorization: `Bearer ${str(token.access_token)}` });
    const username = str(u.username);
    if (!u.id || !username) throw new ProviderError("GitLab did not return a user.");
    return {
      providerUserId: String(u.id),
      username,
      displayName: plain(u.name, 120) || username,
      avatarUrl: safeUrl(u.avatar_url),
      profileUrl: safeUrl(u.web_url),
    };
  },

  async sync(source, since, ctx) {
    const b = base(ctx.env, source);
    const token = optStr(ctx.env.GITLAB_SYNC_TOKEN);
    const headers: Record<string, string> = token ? { "PRIVATE-TOKEN": token } : {};
    const scope = source.repo
      ? `projects/${encodeURIComponent(`${source.owner}/${source.repo}`)}`
      : `groups/${encodeURIComponent(source.owner)}`;
    const out: NormalisedContribution[] = [];
    for (const [path, type] of [["merge_requests", "mr"], ["issues", "issue"]] as const) {
      for (let page = 1; page <= 20; page++) {
        const qs = new URLSearchParams({ state: "all", scope: "all", per_page: "100", page: String(page), order_by: "updated_at" });
        if (since) qs.set("updated_after", since.toISOString());
        const items = await getJson<GlItem[]>(ctx.fetch, `${b}/api/v4/${scope}/${path}?${qs}`, headers);
        for (const i of items) {
          const c = mapGitlabItem(i, type, source.house);
          if (c) out.push(c);
        }
        if (items.length < 100) break;
      }
    }
    return out;
  },
};
