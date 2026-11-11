// Hugging Face: "Sign in with HF" (OpenID Connect, `openid profile` scopes) and sync of an organisation's models,
// datasets and spaces, attributed per commit author (an org owns the repos, so authorship comes from commits).
// NOT TESTED against the live Hub API: written from the documented endpoints; mapping is fixture-tested.
import {
  getJson, optStr, plain, ProviderError, safeUrl, str,
  type ContributionKind, type NormalisedContribution, type ProviderAdapter, type TrackedSource,
} from "./types.js";

const HUB = "https://huggingface.co";

interface HubRepo { id: string; lastModified?: string; createdAt?: string }
interface HubCommit { id: string; title: string; date: string; authors: { user: string }[] }

type RepoType = "model" | "dataset" | "space";
const PATH: Record<RepoType, string> = { model: "models", dataset: "datasets", space: "spaces" };
const URLP: Record<RepoType, string> = { model: "", dataset: "datasets/", space: "spaces/" };

/** One contribution per (repo, author): the latest commit by that author in the synced window. */
export function mapHubCommits(type: RepoType, repoId: string, commits: HubCommit[], house: TrackedSource["house"], since: Date | null): NormalisedContribution[] {
  const byAuthor = new Map<string, HubCommit>();
  for (const c of commits) {
    if (since && new Date(c.date) < since) continue;
    for (const a of c.authors ?? []) {
      const u = str(a.user);
      if (u && !byAuthor.has(u)) byAuthor.set(u, c); // commits arrive newest first
    }
  }
  return [...byAuthor.entries()].map(([user, c]) => ({
    provider: "huggingface",
    providerContributionId: `${type}:${repoId}:${user}`,
    kind: type as ContributionKind,
    title: `${repoId}: ${plain(c.title, 200)}`,
    url: `${HUB}/${URLP[type]}${repoId}`,
    repo: repoId,
    state: "published" as const,
    author: { username: user },
    occurredAt: new Date(c.date),
    house,
  }));
}

export const huggingface: ProviderAdapter = {
  id: "huggingface",
  name: "Hugging Face",
  category: "ml",
  blurb: "Models, datasets and spaces in the Collective’s Hugging Face organisations.",
  envVars: ["HF_CLIENT_ID", "HF_CLIENT_SECRET"],
  syncEnvVars: ["HF_SYNC_TOKEN"],
  setup: [
    "huggingface.co → Settings → Connected Apps → Create app (OAuth).",
    "Redirect URL: {callback}. Scopes: openid, profile.",
    "Set HF_CLIENT_ID and HF_CLIENT_SECRET.",
    "Optional: HF_SYNC_TOKEN (read token) for private repos in the organisation.",
  ],
  tested: "Mapping fixture-tested. Not tested against the live Hub API.",

  oauth(env) {
    if (!env.HF_CLIENT_ID || !env.HF_CLIENT_SECRET) return null;
    return {
      authorizeUrl: `${HUB}/oauth/authorize`,
      tokenUrl: `${HUB}/oauth/token`,
      clientId: env.HF_CLIENT_ID,
      clientSecret: env.HF_CLIENT_SECRET,
      scopes: ["openid", "profile"],
      pkce: true,
      tokenAuth: "basic",
    };
  },

  async profile(token, { fetch }) {
    const u = await getJson<Record<string, unknown>>(fetch, `${HUB}/oauth/userinfo`, { Authorization: `Bearer ${str(token.access_token)}` });
    const username = str(u.preferred_username);
    if (!u.sub || !username) throw new ProviderError("Hugging Face did not return a user.");
    return {
      providerUserId: str(u.sub),
      username,
      displayName: plain(u.name, 120) || username,
      avatarUrl: safeUrl(u.picture),
      profileUrl: safeUrl(u.profile) ?? `${HUB}/${username}`,
    };
  },

  async sync(source, since, ctx) {
    const token = optStr(ctx.env.HF_SYNC_TOKEN);
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const out: NormalisedContribution[] = [];
    for (const type of ["model", "dataset", "space"] as RepoType[]) {
      const repos: HubRepo[] = source.repo
        ? [{ id: `${source.owner}/${source.repo}` }]
        : await getJson<HubRepo[]>(ctx.fetch, `${HUB}/api/${PATH[type]}?author=${encodeURIComponent(source.owner)}&limit=200`, headers);
      for (const r of repos) {
        if (since && r.lastModified && new Date(r.lastModified) < since) continue;
        let commits: HubCommit[];
        try {
          commits = await getJson<HubCommit[]>(ctx.fetch, `${HUB}/api/${PATH[type]}/${r.id}/commits/main`, headers);
        } catch {
          continue; // e.g. a single named repo that is a model, not a dataset
        }
        out.push(...mapHubCommits(type, r.id, commits, source.house, since));
      }
    }
    return out;
  },
};
