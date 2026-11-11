// Async content access for ITC Institute pages. Everything here reads published content via the CMS.
import { getPublished, getPublishedOne, getSingleton } from "@/lib/api";
import type { SeasonOfYear } from "@/lib/calendar";
import type { Center } from "@/lib/centers";
import type { Fellowship } from "@/lib/fellowships";
import { resolvePeople, type PeopleGroup } from "@/lib/people";
import type { Volume } from "@/lib/proceedings";

// The editor omits empty optional lists and fields; pages expect arrays.
const normaliseCenter = (c: Center): Center => ({
  ...c,
  mission: c.mission ?? [],
  questions: c.questions ?? [],
  programs: c.programs ?? [],
  fellows: c.fellows ?? [],
  outputs: c.outputs ?? [],
  involve: c.involve ?? [],
});

const normaliseFellowship = (f: Fellowship): Fellowship => ({
  ...f,
  eligibility: f.eligibility ?? [],
  offered: f.offered ?? [],
  expectations: f.expectations ?? [],
  apply: f.apply ?? [],
  timeline: f.timeline ?? [],
});

const normaliseVolume = (v: Volume): Volume => ({
  ...v,
  year: String(v.year),
  note: v.note ?? [],
  papers: v.papers ?? [],
});

export const getCenters = async () => (await getPublished<Center>("centers")).map(normaliseCenter);
export const getCenter = async (slug: string) => {
  const c = await getPublishedOne<Center>("centers", slug);
  return c && normaliseCenter(c);
};

export const getFellowships = async () => (await getPublished<Fellowship>("fellowships")).map(normaliseFellowship);
export const getFellowship = async (slug: string) => {
  const f = await getPublishedOne<Fellowship>("fellowships", slug);
  return f && normaliseFellowship(f);
};

export const getYear = async () =>
  (await getPublished<SeasonOfYear>("year")).map((y) => ({ ...y, events: y.events ?? [] }));

export const getVolumes = async () => (await getPublished<Volume>("proceedings")).map(normaliseVolume);
export const getVolume = async (year: string) => {
  const v = await getPublishedOne<Volume>("proceedings", year);
  return v && normaliseVolume(v);
};

/** People groups, with groups that draw on the centers filled from the published centers. */
export const getPeople = async () => {
  const [groups, centers] = await Promise.all([getPublished<PeopleGroup>("people"), getCenters()]);
  return resolvePeople(groups.map((g) => ({ ...g, people: g.people ?? [] })), centers);
};

export const getFellowshipEmail = async () =>
  (await getSingleton<{ fellowshipsEmail?: string }>("contact"))?.fellowshipsEmail || "";
