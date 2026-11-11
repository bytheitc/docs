// Crowdin: OAuth sign-in (identity only) and sync of translation work per project from the "top-members" report.
// The report gives each member's own words translated/approved per language; the portal stores one record per
// member, language and month. It never shows the report's ordering: no ranking (see BRAND/ROADMAP).
// NOT TESTED against the live Crowdin API: written from the documented API v2; the report mapping is fixture-tested.
import {
  getJson, ProviderError, plain, safeUrl, str, trimSlash,
  type NormalisedContribution, type ProviderAdapter, type TrackedSource,
} from "./types.js";

const ACCOUNTS = "https://accounts.crowdin.com";
const apiBase = (env: Record<string, string | undefined>) => trimSlash(env.CROWDIN_API_URL || "https://api.crowdin.com/api/v2");

interface TopMembers {
  data?: { user: { id: number; username: string; fullName?: string }; languages?: { id: string; name: string }[]; translated?: number; approved?: number }[];
}

export function mapCrowdinReport(project: string, period: string, report: TopMembers, house: TrackedSource["house"], at: Date): NormalisedContribution[] {
  const out: NormalisedContribution[] = [];
  for (const m of report.data ?? []) {
    const words = Number(m.translated ?? 0) + Number(m.approved ?? 0);
    if (!m.user?.id || words <= 0) continue;
    const langs = (m.languages ?? []).map((l) => plain(l.name, 40)).filter(Boolean);
    out.push({
      provider: "crowdin",
      providerContributionId: `${project}:${m.user.id}:${period}`,
      kind: "translation",
      title: `Translation${langs.length ? ` into ${langs.join(", ")}` : ""} (${period})`,
      url: `https://crowdin.com/project/${encodeURIComponent(project)}`,
      repo: project,
      state: "published",
      author: { id: String(m.user.id), username: str(m.user.username) },
      occurredAt: at,
      house,
    });
  }
  return out;
}

export const crowdin: ProviderAdapter = {
  id: "crowdin",
  name: "Crowdin",
  category: "translation",
  blurb: "Translation work on the Collective’s Crowdin projects.",
  envVars: ["CROWDIN_CLIENT_ID", "CROWDIN_CLIENT_SECRET"],
  syncEnvVars: ["CROWDIN_SYNC_TOKEN", "CROWDIN_API_URL"],
  setup: [
    "Crowdin → Account Settings → OAuth Apps → New application.",
    "Authorization callback URL: {callback}. Scope: user (read).",
    "Set CROWDIN_CLIENT_ID and CROWDIN_CLIENT_SECRET.",
    "For sync, set CROWDIN_SYNC_TOKEN (a personal access token of a project manager, scope: projects, reports). Crowdin Enterprise: also CROWDIN_API_URL.",
    "Sources: owner = numeric project id; repo = project identifier used in its public URL.",
  ],
  tested: "Report mapping fixture-tested. Not tested against the live Crowdin API.",

  oauth(env) {
    if (!env.CROWDIN_CLIENT_ID || !env.CROWDIN_CLIENT_SECRET) return null;
    return {
      authorizeUrl: `${ACCOUNTS}/oauth/authorize`,
      tokenUrl: `${ACCOUNTS}/oauth/token`,
      clientId: env.CROWDIN_CLIENT_ID,
      clientSecret: env.CROWDIN_CLIENT_SECRET,
      scopes: ["user.read"],
      pkce: false,
      tokenAuth: "body",
    };
  },

  async profile(token, { fetch, env }) {
    const r = await getJson<{ data?: Record<string, unknown> }>(fetch, `${apiBase(env)}/user`, { Authorization: `Bearer ${str(token.access_token)}` });
    const u = r.data ?? {};
    const username = str(u.username);
    if (!u.id || !username) throw new ProviderError("Crowdin did not return a user.");
    return {
      providerUserId: String(u.id),
      username,
      displayName: plain(u.fullName, 120) || username,
      avatarUrl: safeUrl(u.avatarUrl),
      profileUrl: `https://crowdin.com/profile/${encodeURIComponent(username)}`,
    };
  },

  async sync(source, since, ctx) {
    const token = ctx.env.CROWDIN_SYNC_TOKEN;
    if (!token) throw new ProviderError("CROWDIN_SYNC_TOKEN is not set.");
    if (!/^\d+$/.test(source.owner)) throw new ProviderError("A Crowdin source's owner must be the numeric project id.");
    const api = apiBase(ctx.env);
    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const now = new Date();
    const from = since ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const period = now.toISOString().slice(0, 7);
    const gen = await ctx.fetch(`${api}/projects/${source.owner}/reports`, {
      method: "POST", headers: auth,
      body: JSON.stringify({ name: "top-members", schema: { unit: "words", format: "json", dateFrom: from.toISOString(), dateTo: now.toISOString() } }),
    });
    if (!gen.ok) throw new ProviderError(`Crowdin report request failed (${gen.status}).`);
    const reportId = str(((await gen.json()) as { data?: { identifier?: string } }).data?.identifier);
    for (let i = 0; i < 20; i++) {
      const st = await getJson<{ data?: { status?: string } }>(ctx.fetch, `${api}/projects/${source.owner}/reports/${reportId}`, auth);
      if (st.data?.status === "finished") break;
      if (st.data?.status === "failed") throw new ProviderError("Crowdin report failed.");
      await new Promise((r) => setTimeout(r, 1500));
    }
    const dl = await getJson<{ data?: { url?: string } }>(ctx.fetch, `${api}/projects/${source.owner}/reports/${reportId}/download`, auth);
    const url = safeUrl(dl.data?.url);
    if (!url) throw new ProviderError("Crowdin returned no report URL.");
    const report = await getJson<TopMembers>(ctx.fetch, url);
    return mapCrowdinReport(source.repo || source.owner, period, report, source.house, now);
  },
};
