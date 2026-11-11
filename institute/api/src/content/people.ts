// The people of the Institute. Roles only: every name is a placeholder until announced.
// Seed content for the "people" collection; pages read the published list via lib/data.ts.
import { TBA, type Center } from "./centers.js";

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

export const SEED_PEOPLE: PeopleGroup[] = [
  {
    id: "officers",
    kicker: "Officers",
    title: "Those who keep the house",
    intro: "The officers of the Institute look after its common life: the calendar, the fellowships and the care of the centers.",
    people: [
      { role: "Director of the Institute", name: TBA },
      { role: "Dean of Fellows", name: TBA },
      { role: "Registrar", name: TBA },
      { role: "Editor of the Proceedings", name: TBA },
    ],
  },
  {
    id: "fellows",
    kicker: "Fellows",
    title: "Those who carry the work",
    intro: "Each center is led by a director and kept by its fellows and junior fellows. The year's cohort is announced at convocation.",
    fromCenters: "Fellows of the centers",
    people: [],
  },
  {
    id: "visiting",
    kicker: "Visiting Scholars",
    title: "Those who come to teach",
    intro: "Scholars of the Islamic sciences who join a center for a term, offering counsel and companionship to its work.",
    fromCenters: "Visiting scholars of the centers",
    people: [],
  },
  {
    id: "advisory",
    kicker: "Advisory Board",
    title: "Those who counsel",
    intro: "The advisory board offers counsel to the Institute on its direction, its scholarship and its faithfulness to the tradition it serves.",
    people: [
      { role: "Chair of the Advisory Board", name: TBA },
      { role: "Scholar of Islamic law", name: TBA },
      { role: "Scholar of Islamic ethics", name: TBA },
      { role: "Scholar of manuscript traditions", name: TBA },
      { role: "Practitioner in technology", name: TBA },
      { role: "Practitioner in community life", name: TBA },
    ],
  },
];

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
