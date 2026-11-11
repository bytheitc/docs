// Async content access for the Collective's pages. Everything here reads published content via the CMS.
import { getPublished, getPublishedOne, getSingleton } from "@/lib/cms/content";
import type { ItcEvent } from "@/lib/events";
import type { FaqItem } from "@/lib/faq";
import type { HouseProfile } from "@/lib/houseProfiles";
import { HOUSES, type HouseId } from "@/lib/houses";
import type { NewsPost } from "@/lib/news";
import { SEED_CONTACT, SEED_GIVING, SEED_JOIN, SEED_PRESS, type ContactPage, type GivingPage, type JoinPage, type PressPage } from "@/lib/pages";
import type { PolicyDoc } from "@/lib/policies";
import type { Principle } from "@/lib/principles";
import { SEED_TEAM, type Team } from "@/lib/team";

const isHouse = (x: unknown): x is HouseId => HOUSES.some((h) => h.id === x);

// The editor drops empty values, so optional links and lists may be missing or half-filled.
type Link = { label?: string; href?: string } | undefined;
const link = (l: Link) => (l?.label && l?.href ? { label: l.label, href: l.href } : undefined);

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

export const getPolicy = async (slug: string) => {
  const p = await getPublishedOne<PolicyDoc>("policies", slug);
  return p && { ...p, sections: p.sections ?? [] };
};

export const getTeam = async (): Promise<Team> => {
  const t = (await getSingleton<Team>("team")) ?? SEED_TEAM;
  return { ...t, leadership: t.leadership ?? [], stewards: t.stewards ?? [], councils: t.councils ?? [] };
};

export const getJoinPage = async (): Promise<JoinPage> => {
  const j = (await getSingleton<JoinPage>("join")) ?? SEED_JOIN;
  return { ...j, ways: (j.ways ?? []).map((w) => ({ ...w, link: link(w.link) })) };
};

export const getGivingPage = async (): Promise<GivingPage> => {
  const g = (await getSingleton<GivingPage>("giving")) ?? SEED_GIVING;
  return { ...g, uses: g.uses ?? [], options: g.options ?? [], note: g.note ?? "", notice: g.notice ?? [] };
};

export const getContactPage = async (): Promise<ContactPage> => {
  const c = (await getSingleton<ContactPage>("contact")) ?? SEED_CONTACT;
  return { ...c, channels: c.channels ?? [], topics: c.topics?.length ? c.topics : SEED_CONTACT.topics };
};

export const getPressPage = async (): Promise<PressPage> => {
  const p = (await getSingleton<PressPage>("press")) ?? SEED_PRESS;
  return { ...p, centers: (p.centers ?? []).filter((c) => isHouse(c.house)), donts: p.donts ?? [], guidelines: p.guidelines ?? "" };
};
