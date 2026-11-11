// ORCID: sign-in with the `/authenticate` scope (the token response itself carries the ORCID iD and name),
// and sync of each linked researcher's public works from the public API by identifier. No credentials needed.
// NOT TESTED against the live ORCID API: written from the documented v3.0 public API; mapping is fixture-tested.
import {
  getJson, plain, ProviderError, safeUrl, str,
  type NormalisedContribution, type ProviderAdapter, type TrackedSource,
} from "./types";

const ORCID_ID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
const base = (env: Record<string, string | undefined>) => (env.ORCID_SANDBOX === "1" ? "sandbox.orcid.org" : "orcid.org");

interface WorkSummary {
  "put-code": number;
  title?: { title?: { value?: string } };
  type?: string;
  "publication-date"?: { year?: { value?: string }; month?: { value?: string }; day?: { value?: string } } | null;
  url?: { value?: string } | null;
  "external-ids"?: { "external-id"?: { "external-id-type": string; "external-id-value": string; "external-id-url"?: { value?: string } | null }[] };
}
interface WorksResponse { group?: { "work-summary"?: WorkSummary[] }[] }

export function mapOrcidWorks(orcid: string, data: WorksResponse, house: TrackedSource["house"], since: Date | null): NormalisedContribution[] {
  const out: NormalisedContribution[] = [];
  for (const g of data.group ?? []) {
    const w = g["work-summary"]?.[0];
    if (!w) continue;
    const d = w["publication-date"];
    const y = Number(d?.year?.value);
    if (!y) continue;
    const date = new Date(Date.UTC(y, Math.max(0, Number(d?.month?.value ?? 1) - 1), Number(d?.day?.value ?? 1)));
    if (since && date < since) continue;
    const ext = w["external-ids"]?.["external-id"] ?? [];
    const doi = ext.find((e) => e["external-id-type"] === "doi");
    const url = safeUrl(w.url?.value) ?? (doi ? `https://doi.org/${doi["external-id-value"]}` : undefined) ?? `https://orcid.org/${orcid}`;
    out.push({
      provider: "orcid",
      providerContributionId: `${orcid}:${w["put-code"]}`,
      kind: "work",
      title: plain(w.title?.title?.value) || "Untitled work",
      url,
      repo: plain(w.type, 60) || undefined,
      state: "published",
      author: { id: orcid },
      occurredAt: date,
      house,
    });
  }
  return out;
}

export const orcid: ProviderAdapter = {
  id: "orcid",
  name: "ORCID",
  category: "research",
  blurb: "Publications and datasets listed on your public ORCID record.",
  envVars: ["ORCID_CLIENT_ID", "ORCID_CLIENT_SECRET"],
  syncEnvVars: ["ORCID_SANDBOX"],
  ownerOptional: true,
  setup: [
    "orcid.org → Developer tools → Register for the free ORCID public API.",
    "Redirect URI: {callback}",
    "Set ORCID_CLIENT_ID and ORCID_CLIENT_SECRET. Set ORCID_SANDBOX=1 to use sandbox.orcid.org while testing.",
    "Sync reads each linked contributor’s public works by ORCID iD; no extra credentials. Leave the source’s owner empty.",
  ],
  tested: "Mapping fixture-tested. Not tested against the live ORCID API.",

  oauth(env) {
    if (!env.ORCID_CLIENT_ID || !env.ORCID_CLIENT_SECRET) return null;
    const b = base(env);
    return {
      authorizeUrl: `https://${b}/oauth/authorize`,
      tokenUrl: `https://${b}/oauth/token`,
      clientId: env.ORCID_CLIENT_ID,
      clientSecret: env.ORCID_CLIENT_SECRET,
      scopes: ["/authenticate"],
      pkce: false,
      tokenAuth: "body",
    };
  },

  // ORCID returns the iD and name in the token response; no API call is needed.
  async profile(token, { env }) {
    const id = str(token.orcid);
    if (!ORCID_ID.test(id)) throw new ProviderError("ORCID did not return an iD.");
    return {
      providerUserId: id,
      username: id,
      displayName: plain(token.name, 120) || id,
      profileUrl: `https://${base(env)}/${id}`,
    };
  },

  async sync(source, since, ctx) {
    const out: NormalisedContribution[] = [];
    for (const a of ctx.linkedAccounts) {
      if (!ORCID_ID.test(a.providerUserId)) continue;
      const data = await getJson<WorksResponse>(ctx.fetch, `https://pub.${base(ctx.env)}/v3.0/${a.providerUserId}/works`);
      out.push(...mapOrcidWorks(a.providerUserId, data, source.house, since));
    }
    return out;
  },
};
