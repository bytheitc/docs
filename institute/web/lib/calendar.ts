// The Institute's year. Seasons only: dates are announced each year (TBA).
// Seed content for the "year" collection; pages read the published list via lib/data.ts.
import type { Season } from "@/lib/fellowships";

export interface YearEvent {
  title: string;
  kind: "Convocation" | "Seminar" | "Colloquium" | "Proceedings" | "Lecture" | "Gathering";
  when: string;
  body: string;
}

export const SEASONS: Season[] = ["Autumn", "Winter", "Spring", "Summer"];
export const EVENT_KINDS: YearEvent["kind"][] = ["Convocation", "Seminar", "Colloquium", "Proceedings", "Lecture", "Gathering"];

export interface SeasonOfYear {
  /** Entry id and page anchor, e.g. "autumn". */
  slug: string;
  season: Season;
  title: string;
  body: string;
  events: YearEvent[];
}
