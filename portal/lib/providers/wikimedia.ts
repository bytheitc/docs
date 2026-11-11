// Wikimedia (Wikipedia, Wikidata, Wikisource, Commons…): OAuth 2 via meta.wikimedia.org (identity only), and sync of
// edits to tracked pages from the public Action API (no credentials).
// NOT TESTED against the live Wikimedia APIs: written from the documented endpoints; mapping is fixture-tested.
import {
  getJson, plain, ProviderError, str,
  type NormalisedContribution, type ProviderAdapter, type TrackedSource,
} from "./types";

const META = "https://meta.wikimedia.org";
const WIKI_HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.(wikipedia|wikimedia|wikidata|wikisource|wikibooks|wikiversity|wikiquote|wiktionary|wikinews|wikivoyage)\.org$|^(www\.wikidata|commons\.wikimedia|meta\.wikimedia)\.org$/;

interface RevQuery {
  query?: { pages?: { pageid?: number; title: string; missing?: boolean; revisions?: { revid: number; user?: string; userid?: number; timestamp: string; comment?: string }[] }[] };
}

export function mapWikiRevisions(host: string, data: RevQuery, house: TrackedSource["house"]): NormalisedContribution[] {
  const out: NormalisedContribution[] = [];
  for (const p of data.query?.pages ?? []) {
    for (const r of p.revisions ?? []) {
      if (!r.user) continue; // hidden user
      out.push({
        provider: "wikimedia",
        providerContributionId: `${host}:${r.revid}`,
        kind: "edit",
        title: `${plain(p.title, 200)}${r.comment ? `: ${plain(r.comment, 120)}` : ""}`,
        url: `https://${host}/w/index.php?diff=${r.revid}&oldid=prev`,
        repo: `${host}/${plain(p.title, 200)}`,
        state: "published",
        // Wikimedia user ids differ per wiki; the global identity is the username, so match on that.
        author: { username: r.user },
        occurredAt: new Date(r.timestamp),
        house,
      });
    }
  }
  return out;
}

export const wikimedia: ProviderAdapter = {
  id: "wikimedia",
  name: "Wikimedia",
  category: "writing",
  blurb: "Edits to tracked pages on Wikipedia and the other Wikimedia wikis.",
  envVars: ["WIKIMEDIA_CLIENT_ID", "WIKIMEDIA_CLIENT_SECRET"],
  setup: [
    "meta.wikimedia.org → Special:OAuthConsumerRegistration/propose/oauth2.",
    "Callback URL: {callback}. Choose “User identity verification only, no ability to read pages or act on a user’s behalf”.",
    "Set WIKIMEDIA_CLIENT_ID and WIKIMEDIA_CLIENT_SECRET (the consumer key and secret).",
    "Sources: owner = the wiki’s domain (e.g. en.wikipedia.org), page = titles separated by “|”. Edits come from the public API.",
  ],
  tested: "Mapping fixture-tested. Not tested against the live Wikimedia APIs.",

  oauth(env) {
    if (!env.WIKIMEDIA_CLIENT_ID || !env.WIKIMEDIA_CLIENT_SECRET) return null;
    return {
      authorizeUrl: `${META}/w/rest.php/oauth2/authorize`,
      tokenUrl: `${META}/w/rest.php/oauth2/access_token`,
      clientId: env.WIKIMEDIA_CLIENT_ID,
      clientSecret: env.WIKIMEDIA_CLIENT_SECRET,
      scopes: [],
      pkce: true,
      tokenAuth: "body",
    };
  },

  async profile(token, { fetch }) {
    const u = await getJson<Record<string, unknown>>(fetch, `${META}/w/rest.php/oauth2/resource/profile`, { Authorization: `Bearer ${str(token.access_token)}` });
    const username = str(u.username);
    if (!u.sub || !username) throw new ProviderError("Wikimedia did not return a user.");
    return {
      providerUserId: str(u.sub),
      username,
      displayName: username,
      profileUrl: `${META}/wiki/User:${encodeURIComponent(username.replace(/ /g, "_"))}`,
    };
  },

  async sync(source, since, ctx) {
    const host = (source.baseUrl || source.owner).replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    if (!WIKI_HOST.test(host)) throw new ProviderError(`Not a Wikimedia wiki: ${host}`);
    const titles = str(source.page).split("|").map((t) => t.trim()).filter(Boolean).slice(0, 50);
    if (!titles.length) throw new ProviderError("A Wikimedia source needs one or more page titles.");
    const out: NormalisedContribution[] = [];
    for (const title of titles) {
      // rvlimit applies per page when one title is queried; paginate with rvcontinue.
      let cont: string | undefined;
      for (let i = 0; i < 10; i++) {
        const qs = new URLSearchParams({
          action: "query", format: "json", formatversion: "2", prop: "revisions", titles: title,
          rvprop: "ids|user|userid|timestamp|comment", rvlimit: "500", rvdir: "older",
        });
        if (since) qs.set("rvend", since.toISOString());
        if (cont) qs.set("rvcontinue", cont);
        const data = await getJson<RevQuery & { continue?: { rvcontinue?: string } }>(ctx.fetch, `https://${host}/w/api.php?${qs}`);
        out.push(...mapWikiRevisions(host, data, source.house));
        cont = data.continue?.rvcontinue;
        if (!cont) break;
      }
    }
    return out;
  },
};
