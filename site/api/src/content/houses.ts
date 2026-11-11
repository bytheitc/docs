// ITC brand constant: the six properties of the collective.
// Each URL can be overridden per environment, e.g. NEXT_PUBLIC_ITC_AI_URL=https://ai.itc.org
export type HouseId = "site" | "ai" | "engineering" | "institute" | "oss" | "research";

export interface House {
  id: HouseId;
  name: string;
  arabic: string;
  transliteration: string;
  sense: string;
  url: string;
}

export const HOUSES: House[] = [
  { id: "site", name: "Collective", arabic: "جماعة", transliteration: "jamāʿa", sense: "the collective", url: process.env.NEXT_PUBLIC_ITC_SITE_URL ?? "http://localhost:3000" },
  { id: "ai", name: "AI", arabic: "ذكاء", transliteration: "dhakāʾ", sense: "intelligence", url: process.env.NEXT_PUBLIC_ITC_AI_URL ?? "http://localhost:3001" },
  { id: "engineering", name: "Engineering", arabic: "هندسة", transliteration: "handasa", sense: "engineering · geometry", url: process.env.NEXT_PUBLIC_ITC_ENGINEERING_URL ?? "http://localhost:3002" },
  { id: "institute", name: "Institute", arabic: "معهد", transliteration: "maʿhad", sense: "institute", url: process.env.NEXT_PUBLIC_ITC_INSTITUTE_URL ?? "http://localhost:3003" },
  { id: "oss", name: "Open Source", arabic: "مشاع", transliteration: "mashāʿ", sense: "the commons", url: process.env.NEXT_PUBLIC_ITC_OSS_URL ?? "http://localhost:3004" },
  { id: "research", name: "Research", arabic: "بحث", transliteration: "baḥth", sense: "inquiry", url: process.env.NEXT_PUBLIC_ITC_RESEARCH_URL ?? "http://localhost:3005" },
];

export const house = (id: HouseId): House => HOUSES.find((h) => h.id === id)!;

/** The contributor portal: a Collective-level service, not a house. */
export const PORTAL_URL = process.env.NEXT_PUBLIC_ITC_PORTAL_URL ?? "http://localhost:3006";
