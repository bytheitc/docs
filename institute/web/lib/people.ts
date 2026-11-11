// The people of the Institute. Roles only: every name is a placeholder until announced.
// Seed content for the "people" collection; pages read the published list via lib/data.ts.
import { TBA, type Center } from "@/lib/centers";

export interface Person {
  role: string;
  affiliation?: string;
  name: string;
}

/** A group can list its people by hand, or take them from the centers' own rosters (so they never drift apart). */
export const PEOPLE_SOURCES = ["Fellows of the centers", "Visiting scholars of the centers"] as const;
export type PeopleSource = (typeof PEOPLE_SOURCES)[number];

export interface PeopleGroup {
  id: string;
  kicker: string;
  title: string;
  intro: string;
  fromCenters?: PeopleSource;
  people: Person[];
}

/** Fills groups that take their people from the centers' rosters. Hand-listed people come after. */
export function resolvePeople(groups: PeopleGroup[], centers: Center[]): PeopleGroup[] {
  return groups.map((g) => {
    if (!g.fromCenters) return g;
    const visiting = g.fromCenters === "Visiting scholars of the centers";
    const derived = centers.flatMap((c) =>
      c.fellows
        .filter((f) => (f.role === "Visiting Scholar") === visiting)
        .map((f) => ({ role: f.role, affiliation: c.name, name: f.name })),
    );
    return { ...g, people: [...derived, ...g.people] };
  });
}
