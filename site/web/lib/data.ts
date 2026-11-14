// Async content access for the Collective's pages. Everything here reads published content from
// this house's api (site/api), which in turn reads the CMS. Pages call these, never fetch directly.
//
// The editor drops empty values and the api can be unreachable, so every reader fills in what is
// missing: a page renders its empty state rather than throwing.
import { getPublished, getPublishedOne, getSingleton } from "@/lib/api";
import type { ItcEvent } from "@/lib/events";
import type { FaqItem } from "@/lib/faq";
import type { HouseProfile } from "@/lib/houseProfiles";
import { HOUSES, type HouseId } from "@/lib/houses";
import type { NewsPost } from "@/lib/news";
import type { ContactPage, GivingPage, JoinPage, MobilePage, PressPage } from "@/lib/pages";
import type { PolicyDoc } from "@/lib/policies";
import type { Principle } from "@/lib/principles";
import type { Rfp } from "@/lib/rfps";
import type { SuggestPage } from "@/lib/suggestions";
import type { Team } from "@/lib/team";

const isHouse = (x: unknown): x is HouseId => HOUSES.some((h) => h.id === x);

type Link = { label?: string; href?: string } | undefined;
const link = (l: Link) => (l?.label && l?.href ? { label: l.label, href: l.href } : undefined);

/* ---------------- Collections ---------------- */

function normaliseEvent(e: ItcEvent): ItcEvent {
  const hosts = (e.hosts ?? []).filter(isHouse);
  return { ...e, hosts: hosts.length ? hosts : ["site"], body: e.body ?? [], agenda: e.agenda ?? [] };
}

export const getEvents = async () => (await getPublished<ItcEvent>("events")).map(normaliseEvent);
export const getEvent = async (slug: string) => {
  const e = await getPublishedOne<ItcEvent>("events", slug);
  return e && normaliseEvent(e);
};

const normalisePost = (p: NewsPost): NewsPost => ({ ...p, body: p.body ?? [] });
export const getNews = async () => (await getPublished<NewsPost>("news")).map(normalisePost);
export const getPost = async (slug: string) => {
  const p = await getPublishedOne<NewsPost>("news", slug);
  return p && normalisePost(p);
};

export const getPrinciples = () => getPublished<Principle>("principles");

export const getHouseProfiles = async () =>
  (await getPublished<HouseProfile>("houses")).map((h) => ({ ...h, focus: h.focus ?? [], collaborates: h.collaborates ?? [] }));

export const getFaq = async () =>
  (await getPublished<FaqItem>("faq")).map((f) => ({ ...f, link: link(f.link) }));

const normaliseRfp = (r: Rfp): Rfp => ({
  ...r,
  need: r.need ?? [], scope: r.scope ?? [], criteria: r.criteria ?? [], conditions: r.conditions ?? [],
  sections: (r.sections ?? []).map((x) => ({ ...x, body: x.body ?? [] })),
});

export const getRfps = async () => (await getPublished<Rfp>("rfps")).map(normaliseRfp);
export const getRfp = async (slug: string) => {
  const r = await getPublishedOne<Rfp>("rfps", slug);
  return r && normaliseRfp(r);
};

export const getPolicy = async (slug: string) => {
  const p = await getPublishedOne<PolicyDoc>("policies", slug);
  return p && { ...p, sections: p.sections ?? [] };
};

/* ---------------- Singletons ---------------- */

// Used only when the api is unreachable; otherwise the api answers with CMS content or its own seed.
const EMPTY_TEAM: Team = { id: "team", leadership: [], stewards: [], councils: [] };
const EMPTY_JOIN: JoinPage = { id: "join", ways: [] };
const EMPTY_GIVING: GivingPage = { id: "giving", uses: [], options: [], email: "", note: "", notice: [] };
const EMPTY_CONTACT: ContactPage = { id: "contact", channels: [], topics: ["General"] };
const EMPTY_SUGGEST: SuggestPage = {
  id: "suggest", headline: "Tell us what to build", intro: "", prompts: [], steps: [], areas: ["Something else entirely"], outOfScope: [], privacy: "",
};
const EMPTY_PRESS: PressPage = { id: "press", email: "", centers: [], donts: [], guidelines: "" };
const EMPTY_MOBILE: MobilePage = { id: "mobile", lede: "", features: [], notYet: [], appStoreUrl: "", playStoreUrl: "", betaNote: "" };

export const getTeam = async (): Promise<Team> => {
  const t = (await getSingleton<Team>("team")) ?? EMPTY_TEAM;
  return { ...t, leadership: t.leadership ?? [], stewards: t.stewards ?? [], councils: t.councils ?? [] };
};

export const getJoinPage = async (): Promise<JoinPage> => {
  const j = (await getSingleton<JoinPage>("join")) ?? EMPTY_JOIN;
  return { ...j, ways: (j.ways ?? []).map((w) => ({ ...w, link: link(w.link) })) };
};

export const getGivingPage = async (): Promise<GivingPage> => {
  const g = (await getSingleton<GivingPage>("giving")) ?? EMPTY_GIVING;
  return { ...g, uses: g.uses ?? [], options: g.options ?? [], note: g.note ?? "", notice: g.notice ?? [] };
};

export const getContactPage = async (): Promise<ContactPage> => {
  const c = (await getSingleton<ContactPage>("contact")) ?? EMPTY_CONTACT;
  return { ...c, channels: c.channels ?? [], topics: c.topics?.length ? c.topics : EMPTY_CONTACT.topics };
};

export const getSuggestPage = async (): Promise<SuggestPage> => {
  const s = (await getSingleton<SuggestPage>("suggest")) ?? EMPTY_SUGGEST;
  return {
    ...s,
    prompts: s.prompts ?? [], steps: s.steps ?? [], outOfScope: s.outOfScope ?? [],
    areas: s.areas?.length ? s.areas : EMPTY_SUGGEST.areas,
  };
};

export const getPressPage = async (): Promise<PressPage> => {
  const p = (await getSingleton<PressPage>("press")) ?? EMPTY_PRESS;
  return { ...p, centers: (p.centers ?? []).filter((c) => isHouse(c.house)), donts: p.donts ?? [], guidelines: p.guidelines ?? "" };
};

export const getMobilePage = async (): Promise<MobilePage> => {
  const m = (await getSingleton<MobilePage>("mobile")) ?? EMPTY_MOBILE;
  return {
    ...m,
    features: (m.features ?? []).filter((f) => f.title && f.body),
    notYet: m.notYet ?? [],
    // An editor who clears a store link means "not published", which the page must be able to tell
    // apart from "published at an unknown address". Empty string is that signal; never a fake href.
    appStoreUrl: m.appStoreUrl ?? "",
    playStoreUrl: m.playStoreUrl ?? "",
    betaNote: m.betaNote ?? "",
  };
};
