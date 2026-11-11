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

export const SEED_YEAR: SeasonOfYear[] = [
  {
    slug: "autumn",
    season: "Autumn",
    title: "Opening convocation",
    body: "Fellows are welcomed and centers present their agendas for the year.",
    events: [
      { title: "Convocation", kind: "Convocation", when: "Early autumn · date TBA", body: "The Institute gathers to open the year. New fellows are welcomed and each center presents the questions it will hold." },
      { title: "Agendas of the centers", kind: "Gathering", when: "Following convocation · TBA", body: "Each center's director sets out the year's programme, and members of the collective are invited to join." },
      { title: "Mentors' pairing", kind: "Gathering", when: "Autumn · TBA", body: "Junior fellows meet their mentors and settle the shape of their projects." },
    ],
  },
  {
    slug: "winter",
    season: "Winter",
    title: "Seminar term",
    body: "Weekly seminars across centers, open to all members of the collective.",
    events: [
      { title: "Weekly seminars", kind: "Seminar", when: "Weekly through the term · times TBA", body: "Each center keeps its own seminar. A text, a case or a work in progress is read closely and discussed in company." },
      { title: "Cross-center readings", kind: "Seminar", when: "Monthly · TBA", body: "A shared reading taken up by two or more centers, so that their questions meet." },
      { title: "Visiting scholar lectures", kind: "Lecture", when: "During the term · TBA", body: "Public lectures by the year's visiting scholars, where they are willing to give them." },
    ],
  },
  {
    slug: "spring",
    season: "Spring",
    title: "Colloquium",
    body: "Work-in-progress presentations, critique and cross-center collaboration.",
    events: [
      { title: "The colloquium", kind: "Colloquium", when: "Mid-spring · dates TBA", body: "Fellows present work in progress. Respondents are drawn from other centers and from among the visiting scholars." },
      { title: "Call for fellows", kind: "Gathering", when: "At the colloquium", body: "The call for the coming year's fellowships is announced." },
      { title: "Proposals for new centers", kind: "Gathering", when: "Spring · TBA", body: "Proposals for new centers received during the year are heard and discussed." },
    ],
  },
  {
    slug: "summer",
    season: "Summer",
    title: "Proceedings",
    body: "The year's work is published with ITC Research and archived openly.",
    events: [
      { title: "Editing the proceedings", kind: "Proceedings", when: "Early summer", body: "The year's papers, reflections and records are gathered and edited." },
      { title: "Publication", kind: "Proceedings", when: "Late summer · TBA", body: "The proceedings are published openly with ITC Research and added to the Institute's archive." },
      { title: "Fellowship conversations", kind: "Gathering", when: "Summer", body: "Centers read applications and hold conversations with prospective fellows." },
    ],
  },
];
