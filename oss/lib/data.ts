// Async content access for ITC Open Source pages. Everything here reads published content via the CMS.
import { getPublished, getPublishedOne, getSingleton } from "@/lib/cms/content";
import type { Contributor, ContributionKindInfo } from "@/lib/contributors";
import { fromEditableSections, type DocPage, type DocSection } from "@/lib/doc";
import { findRepo, toRepo, type Maintainer, type Repo, type RepoRecord } from "@/lib/repos";
import { SEED_SETTINGS, type SiteSettings } from "@/lib/site";
import type { Sprint } from "@/lib/sprints";

// The editor stores empty values as missing and empty lists as []; pages expect the full shapes.
function normaliseRepo(r: RepoRecord): Repo {
  return toRepo({
    ...r,
    overview: r.overview ?? [],
    features: r.features ?? [],
    install: { lang: r.install?.lang ?? "shell", code: r.install?.code ?? "" },
    usage: { lang: r.usage?.lang ?? "text", code: r.usage?.code ?? "" },
    maintainers: (r.maintainers ?? []) as Maintainer[],
    issues: (r.issues ?? []).map((i) => ({ title: i.title, label: i.label, featured: i.featured === true, ...(typeof i.number === "number" ? { number: i.number } : {}) })),
  });
}

const normaliseSprint = (s: Sprint): Sprint => ({
  ...s,
  repos: s.repos ?? [],
  goals: s.goals ?? [],
  schedule: s.schedule ?? [],
  outcome: s.outcome || undefined,
});

export const getRepos = async () => (await getPublished<RepoRecord>("repos")).map(normaliseRepo);
export const getRepo = async (slug: string) => {
  const r = await getPublishedOne<RepoRecord>("repos", slug);
  return r && normaliseRepo(r);
};
export { findRepo };

export const getSprints = async () => (await getPublished<Sprint>("sprints")).map(normaliseSprint);
export const getSprint = async (slug: string) => {
  const s = await getPublishedOne<Sprint>("sprints", slug);
  return s && normaliseSprint(s);
};

export const getContributors = async (): Promise<Contributor[]> =>
  (await getPublished<Contributor>("contributors")).map((c) => ({ ...c, name: c.name || undefined, kinds: c.kinds ?? [], repos: c.repos ?? [] }));

export const getContributionKinds = () => getPublished<ContributionKindInfo>("contribution-kinds");

/** A long-form page's sections, or null if its document is not published. */
export async function getDoc(slug: "contribute" | "governance" | "code-of-conduct"): Promise<DocSection[] | null> {
  const d = await getPublishedOne<DocPage>("docs", slug);
  return d ? fromEditableSections(d.sections) : null;
}

/** Site settings, falling back to the built-in values field by field. */
export async function getSettings(): Promise<SiteSettings> {
  const s = await getSingleton<Partial<SiteSettings>>("settings");
  return {
    id: "settings",
    githubOrgUrl: s?.githubOrgUrl || SEED_SETTINGS.githubOrgUrl,
    contact: { ...SEED_SETTINGS.contact, ...(s?.contact ?? {}) },
  };
}
