// Async content access for ITC Research pages. Everything here reads published content via the CMS.
import { getPublished, getPublishedOne, getSingleton } from "@/lib/cms/content";
import type { Dataset } from "@/lib/datasets";
import type { Office, ResearchGroup } from "@/lib/groups";
import type { Note } from "@/lib/notes";
import type { Policy } from "@/lib/policies";
import type { Publication } from "@/lib/publications";

// The editor stores an empty value as "missing"; datasheets render missing values as "pending" (null).
function normaliseDataset(d: Dataset): Dataset {
  return {
    ...d,
    version: d.version ?? null,
    licence: d.licence ?? null,
    sections: (d.sections ?? []).map((s) => ({ ...s, items: (s.items ?? []).map((i) => ({ ...i, a: i.a ?? null })) })),
  };
}

export const getPublications = () => getPublished<Publication>("publications");
export const getPublication = (id: string) => getPublishedOne<Publication>("publications", id);

export const getDatasets = async () => (await getPublished<Dataset>("datasets")).map(normaliseDataset);
export const getDataset = async (slug: string) => {
  const d = await getPublishedOne<Dataset>("datasets", slug);
  return d && normaliseDataset(d);
};

export const getNotes = () => getPublished<Note>("notes");
export const getNote = (slug: string) => getPublishedOne<Note>("notes", slug);

export const getGroups = () => getPublished<ResearchGroup>("groups");
export const getGroup = (slug: string) => getPublishedOne<ResearchGroup>("groups", slug);

export const getPolicies = () => getPublished<Policy>("policies");

export const getOffice = async () => (await getSingleton<Office>("office"))?.roles ?? [];
