import type { HouseId } from "@/lib/houses";

export const EVENT_FORMATS = ["In person", "Online", "Hybrid"] as const;

export interface ItcEvent {
  slug: string;
  title: string;
  hosts: HouseId[];
  hostLabel: string;
  cadence: string;
  format: (typeof EVENT_FORMATS)[number];
  date: string;
  location: string;
  summary: string;
  body: string[];
  agenda: string[];
  forWhom: string;
}

// Placeholder gatherings. Dates and venues are not yet set.
/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_EVENTS: ItcEvent[] = [
  {
    slug: "annual-majlis",
    title: "Annual Majlis",
    hosts: ["site"],
    hostLabel: "Collective",
    cadence: "Yearly",
    format: "Hybrid",
    date: "TBA",
    location: "Venue to be announced",
    summary: "The yearly gathering of all five houses: talks, workshops and the state of the collective.",
    body: [
      "A majlis is a sitting: a room where people gather to talk, listen and decide together. Once a year all five houses meet in one place to do exactly that.",
      "Each house shares what it built, what it learned and what it got wrong. Members put proposals to the collective council in the open, and there is time set aside for prayer, meals and unhurried conversation.",
    ],
    agenda: ["State of the collective", "One session from each house", "Open shūrā on proposals for the year ahead", "Workshops and hallway time"],
    forWhom: "Members, volunteers, partners and anyone curious about the work.",
  },
  {
    slug: "commons-sprint",
    title: "Commons Sprint",
    hosts: ["oss"],
    hostLabel: "Open Source",
    cadence: "Twice a year",
    format: "Hybrid",
    date: "TBA",
    location: "Online, with local hubs to be announced",
    summary: "Two days of pairing on ITC projects. First-time contributors welcome.",
    body: [
      "Two days of focused work on the projects ITC holds in common. Maintainers prepare a list of well-scoped issues ahead of time and pair with newcomers through their first contribution.",
      "You don’t need to be an engineer. Documentation, translation, design and testing are all part of the sprint.",
    ],
    agenda: ["Kick-off and project tour", "Paired working blocks", "Daily show-and-tell", "Retrospective and thank-yous"],
    forWhom: "Anyone who wants to contribute, especially for the first time.",
  },
  {
    slug: "reading-circle",
    title: "Reading Circle",
    hosts: ["research", "institute"],
    hostLabel: "Research × Institute",
    cadence: "Monthly",
    format: "Online",
    date: "TBA",
    location: "Online",
    summary: "A monthly reading of one paper and one classical text, side by side.",
    body: [
      "Each month we read two things together: a recent paper from computing or the social sciences, and a passage from the classical tradition that speaks to the same question.",
      "A fellow from the Institute and a researcher co-host each session. Readings are sent two weeks ahead, and no prior background is assumed.",
    ],
    agenda: ["Short framing from each host", "Close reading in small groups", "Open discussion", "Notes published afterwards"],
    forWhom: "Readers of every background. Bring questions, not credentials.",
  },
  {
    slug: "builders-iftar",
    title: "Builders’ Iftar",
    hosts: ["site"],
    hostLabel: "Collective",
    cadence: "During Ramadan",
    format: "In person",
    date: "TBA",
    location: "Cities to be announced",
    summary: "Breaking the fast together, followed by short talks from builders across the houses.",
    body: [
      "During Ramadan, local members host iftar for people who build things: engineers, researchers, designers, teachers and students.",
      "After the meal and prayer, a few people each give a short talk about something they are working on. Families welcome.",
    ],
    agenda: ["Iftar and maghrib", "Lightning talks", "Tea and conversation"],
    forWhom: "Everyone. Hosts are matched with volunteers to help.",
  },
  {
    slug: "open-studio",
    title: "Open Studio",
    hosts: ["engineering", "ai"],
    hostLabel: "Engineering × AI",
    cadence: "Monthly",
    format: "Online",
    date: "TBA",
    location: "Online",
    summary: "Drop-in office hours with engineers and AI practitioners. Bring a problem; leave with a next step.",
    body: [
      "Open Studio is a standing appointment for anyone stuck on a technical question. That could be a student project, a nonprofit’s website or a question about whether to use a model at all.",
      "Practitioners from Engineering and AI rotate through. We give advice in good faith, and we will tell you when the honest answer is “don’t build this”.",
    ],
    agenda: ["Short queue of questions submitted in advance", "Open drop-in"],
    forWhom: "Students, nonprofits and early-career builders.",
  },
];
