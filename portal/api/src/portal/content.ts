// The portal's CMS-managed content, read through this api's own CMS client: the landing copy, the FAQ,
// the milestone definitions, the tracked sources and the settings. Falls back to seed content exactly
// as the house content routes do, so the portal keeps working when the CMS is unreachable.
import type { CmsClient } from "../cms.js";
import { SEED_LANDING, SEED_SETTINGS, type Faq, type LandingCopy, type MilestoneDef, type PortalSettings, type SourceDef } from "../content/seed.js";
import type { TrackedSource } from "../providers/types.js";
import { isHouse } from "./util.js";

const DEFAULT_CLAIM_DAYS = 7;

const list = async <T>(cms: CmsClient, collection: string): Promise<T[]> =>
  (await cms.content(collection)).entries as T[];

const one = async <T>(cms: CmsClient, collection: string): Promise<T | undefined> =>
  (await list<T>(cms, collection))[0];

export async function getLanding(cms: CmsClient): Promise<LandingCopy> {
  const l = await one<LandingCopy>(cms, "landing");
  return { ...SEED_LANDING[0], ...(l ?? {}), steps: l?.steps ?? SEED_LANDING[0].steps, privacy: l?.privacy ?? SEED_LANDING[0].privacy };
}

export const getFaq = (cms: CmsClient) => list<Faq>(cms, "faq");
export const getMilestones = (cms: CmsClient) => list<MilestoneDef>(cms, "milestones");

export async function getSettings(cms: CmsClient): Promise<PortalSettings> {
  const s = await one<PortalSettings>(cms, "settings");
  const claimDays = Number(s?.claimDays);
  return { ...SEED_SETTINGS[0], ...(s ?? {}), claimDays: Number.isFinite(claimDays) && claimDays > 0 ? claimDays : DEFAULT_CLAIM_DAYS };
}

const toSource = (s: SourceDef): TrackedSource | null =>
  isHouse(s.house)
    ? { id: s.id, label: s.label, provider: s.provider, owner: s.owner ?? "", repo: s.repo || undefined, page: s.page || undefined, baseUrl: s.baseUrl || undefined, house: s.house, active: !!s.active }
    : null;

/** Published sources, active or not. */
export async function getSources(cms: CmsClient): Promise<TrackedSource[]> {
  return (await list<SourceDef>(cms, "sources")).map(toSource).filter((s): s is TrackedSource => !!s);
}
