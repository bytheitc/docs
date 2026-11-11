// The Institute's centers. Placeholder roster: replace with the real centers before launch.
// Seed content for the "centers" collection (lib/cms/collections.ts). Pages read the published list via lib/data.ts.

export type Area = "Knowledge" | "Society" | "Practice";
export const AREAS: Area[] = ["Knowledge", "Society", "Practice"];

export interface Program {
  name: string;
  body: string;
}

export interface FellowSeat {
  role: string;
  /** Always a placeholder until the roster is confirmed. */
  name: string;
}

export interface Output {
  kind: string;
  title: string;
  body: string;
}

export interface Center {
  slug: string;
  name: string;
  arabic: string;
  translit: string;
  /** English sense of the Arabic word-sign. */
  sense: string;
  area: Area;
  focus: string;
  mission: string[];
  questions: string[];
  programs: Program[];
  fellows: FellowSeat[];
  outputs: Output[];
  involve: Program[];
  email: string;
}

export const TBA = "Name to be announced";

export const findCenter = (centers: Center[], slug: string): Center | undefined => centers.find((c) => c.slug === slug);
