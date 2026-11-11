// Read API for portal pages: CMS content through lib/cms/content.ts, normalised.
import { getPublished, getSingleton } from "@/lib/cms/content";
import { isHouse } from "@/lib/portal/util";
import {
  SEED_LANDING, SEED_SETTINGS,
  type Faq, type LandingCopy, type MilestoneDef, type PortalSettings, type SourceDef,
} from "@/lib/portal/seed";
import type { TrackedSource } from "@/lib/providers/types";

export async function getLanding(): Promise<LandingCopy> {
  const l = await getSingleton<LandingCopy>("landing").catch(() => undefined);
  return { ...SEED_LANDING[0], ...(l ?? {}), steps: l?.steps ?? SEED_LANDING[0].steps, privacy: l?.privacy ?? SEED_LANDING[0].privacy };
}

export const getFaq = () => getPublished<Faq>("faq").catch(() => [] as Faq[]);
export const getMilestones = () => getPublished<MilestoneDef>("milestones").catch(() => [] as MilestoneDef[]);

export async function getSettings(): Promise<PortalSettings> {
  const s = await getSingleton<PortalSettings>("settings").catch(() => undefined);
  const claimDays = Number(s?.claimDays);
  return { ...SEED_SETTINGS[0], ...(s ?? {}), claimDays: Number.isFinite(claimDays) && claimDays > 0 ? claimDays : 7 };
}

const toSource = (s: SourceDef): TrackedSource | null =>
  isHouse(s.house)
    ? { id: s.id, label: s.label, provider: s.provider, owner: s.owner ?? "", repo: s.repo || undefined, page: s.page || undefined, baseUrl: s.baseUrl || undefined, house: s.house, active: !!s.active }
    : null;

/** Published sources (active or not). */
export async function getSources(): Promise<TrackedSource[]> {
  return (await getPublished<SourceDef>("sources")).map(toSource).filter((s): s is TrackedSource => !!s);
}
