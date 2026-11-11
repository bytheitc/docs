// Read API for portal pages: the portal's CMS-managed content, served by portal/api.
import { getPublished, getSingleton } from "@/lib/api";
import type { Faq, LandingCopy, MilestoneDef, PortalSettings } from "@/lib/content-types";

const DEFAULT_CLAIM_DAYS = 7;

// portal/api answers with the CMS's copy or its own seed, so these blanks are reached only when the
// api itself is unreachable.
const EMPTY_LANDING: LandingCopy = {
  id: "landing", headline: "Contributor Portal", intro: "", steps: [], privacy: [], wallIntro: "",
};

export async function getLanding(): Promise<LandingCopy> {
  const l = await getSingleton<LandingCopy>("landing");
  return { ...EMPTY_LANDING, ...(l ?? {}), steps: l?.steps ?? [], privacy: l?.privacy ?? [] };
}

export const getFaq = () => getPublished<Faq>("faq");
export const getMilestones = () => getPublished<MilestoneDef>("milestones");

export async function getSettings(): Promise<PortalSettings> {
  const s = await getSingleton<PortalSettings>("settings");
  const claimDays = Number(s?.claimDays);
  return {
    id: "settings",
    claimDays: Number.isFinite(claimDays) && claimDays > 0 ? claimDays : DEFAULT_CLAIM_DAYS,
    goodFirstIssues: s?.goodFirstIssues ?? "",
  };
}
