// The Institute's three fellowship tiers. Placeholder terms: confirm before launch.
// Seed content for the "fellowships" collection; pages read the published list via lib/data.ts.

export type Season = "Autumn" | "Winter" | "Spring" | "Summer";

export interface Fellowship {
  slug: string;
  roman: string;
  title: string;
  term: string;
  body: string;
  forWhom: string;
  eligibility: string[];
  offered: string[];
  expectations: string[];
  apply: string[];
  timeline: { season: Season; title: string; body: string }[];
}
