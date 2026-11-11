// House-specific: the content types ITC Institute editors manage.
// Each definition drives the CMS editor's forms, validation and storage; `seed` is today's built-in
// content, which also serves this api's read-only fallback when the CMS is unreachable.
import { EVENT_KINDS, SEASONS, SEED_YEAR } from "./calendar.js";
import { AREAS, SEED_CENTERS, TBA } from "./centers.js";
import { SEED_FELLOWSHIP_EMAIL, SEED_FELLOWSHIPS } from "./fellowships.js";
import { PEOPLE_SOURCES, SEED_PEOPLE } from "./people.js";
import { SEED_VOLUMES, VOLUME_STATUSES } from "./proceedings.js";
import type { CollectionDef, Field, SpaceLink } from "./types.js";

const nameBody = (nameLabel: string): Field[] => [
  { type: "text", name: "name", label: nameLabel, required: true },
  { type: "textarea", name: "body", label: "Description", required: true, rows: 2 },
];

const seasonStep: Field[] = [
  { type: "select", name: "season", label: "Season", required: true, options: SEASONS },
  { type: "text", name: "title", label: "Title", required: true },
  { type: "textarea", name: "body", label: "Description", required: true, rows: 2 },
];

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "centers",
    label: "Centers",
    singular: "Center",
    description: "The rooms of the house: mission, questions, programs, fellows and outputs.",
    idField: "slug",
    titleField: "name",
    columns: ["translit", "area"],
    seed: () => SEED_CENTERS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, placeholder: "hikma", help: "Appears in the URL: /centers/slug." },
      { type: "text", name: "name", label: "Name", required: true, placeholder: "Center for …" },
      { type: "text", name: "arabic", label: "Arabic word-sign", required: true, help: "One word in Arabic script. Have a native speaker check it." },
      { type: "text", name: "translit", label: "Transliteration", required: true },
      { type: "text", name: "sense", label: "Sense", required: true, help: "The English meaning of the word-sign." },
      { type: "select", name: "area", label: "Area", required: true, options: AREAS },
      { type: "textarea", name: "focus", label: "Focus", required: true, rows: 2, help: "One sentence for cards and the page lede." },
      { type: "paragraphs", name: "mission", label: "Mission", required: true },
      { type: "lines", name: "questions", label: "Guiding questions", required: true, help: "One per line." },
      { type: "list", name: "programs", label: "Programs", required: true, itemLabel: "program", itemTitle: "name", fields: nameBody("Program") },
      {
        type: "list", name: "fellows", label: "Fellows", itemLabel: "seat", itemTitle: "role",
        help: "Seats in the center. Also listed on the People page.",
        fields: [
          { type: "text", name: "role", label: "Role", required: true, help: "e.g. Director of the Center, Fellow, Junior Fellow, Visiting Scholar." },
          { type: "text", name: "name", label: "Name", required: true, help: `Use “${TBA}” until the person has agreed to be listed.` },
        ],
      },
      {
        type: "list", name: "outputs", label: "Outputs", itemLabel: "output", itemTitle: "title",
        fields: [
          { type: "text", name: "kind", label: "Kind", required: true, placeholder: "Working papers" },
          { type: "text", name: "title", label: "Title", required: true },
          { type: "textarea", name: "body", label: "Description", required: true, rows: 2 },
        ],
      },
      { type: "list", name: "involve", label: "Ways to get involved", itemLabel: "way", itemTitle: "name", fields: nameBody("Title") },
      { type: "email", name: "email", label: "Contact email", required: true },
    ],
  },
  {
    name: "fellowships",
    label: "Fellowships",
    singular: "Fellowship",
    description: "The fellowship tiers: eligibility, what is offered, expectations and how to apply.",
    idField: "slug",
    titleField: "title",
    columns: ["roman", "term"],
    seed: () => SEED_FELLOWSHIPS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Appears in the URL: /fellowships/slug." },
      { type: "text", name: "roman", label: "Tier numeral", required: true, placeholder: "IV", help: "Roman numeral shown on the tier." },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "text", name: "term", label: "Term", required: true, placeholder: "One year" },
      { type: "textarea", name: "body", label: "Summary", required: true, rows: 2 },
      { type: "text", name: "forWhom", label: "For whom", required: true },
      { type: "lines", name: "eligibility", label: "Eligibility", required: true, help: "One per line." },
      { type: "lines", name: "offered", label: "What is offered", required: true, help: "One per line." },
      { type: "lines", name: "expectations", label: "Expectations", required: true, help: "One per line." },
      { type: "lines", name: "apply", label: "How to apply", required: true, help: "One step per line." },
      { type: "list", name: "timeline", label: "Timeline", required: true, itemLabel: "step", itemTitle: "title", help: "The first step's season is shown as “Call opens”.", fields: seasonStep },
    ],
  },
  {
    name: "people",
    label: "People page",
    singular: "People group",
    description: "Groups on the People page: officers, fellows, visiting scholars, advisory board.",
    idField: "id",
    titleField: "kicker",
    columns: ["title", "fromCenters"],
    seed: () => SEED_PEOPLE as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Page anchor, e.g. officers." },
      { type: "text", name: "kicker", label: "Group name", required: true },
      { type: "text", name: "title", label: "Heading", required: true },
      { type: "textarea", name: "intro", label: "Introduction", required: true, rows: 2 },
      {
        type: "select", name: "fromCenters", label: "Take people from the centers", options: PEOPLE_SOURCES,
        help: "Lists the seats from each center's Fellows. Leave empty to list people only by hand below.",
      },
      {
        type: "list", name: "people", label: "People", itemLabel: "person", itemTitle: "role",
        fields: [
          { type: "text", name: "role", label: "Role", required: true },
          { type: "text", name: "affiliation", label: "Affiliation" },
          { type: "text", name: "name", label: "Name", required: true, help: `Use “${TBA}” until the person has agreed to be listed.` },
        ],
      },
    ],
  },
  {
    name: "year",
    label: "The Year",
    singular: "Season",
    description: "The four seasons of the Institute's calendar and their events.",
    idField: "slug",
    titleField: "title",
    columns: ["season"],
    seed: () => SEED_YEAR as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Page anchor, e.g. autumn." },
      { type: "select", name: "season", label: "Season", required: true, options: SEASONS },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "textarea", name: "body", label: "Summary", required: true, rows: 2 },
      {
        type: "list", name: "events", label: "Events", itemLabel: "event", itemTitle: "title",
        fields: [
          { type: "text", name: "title", label: "Title", required: true },
          { type: "select", name: "kind", label: "Kind", required: true, options: EVENT_KINDS },
          { type: "text", name: "when", label: "When", required: true, placeholder: "Early autumn · date TBA" },
          { type: "textarea", name: "body", label: "Description", required: true, rows: 2 },
        ],
      },
    ],
  },
  {
    name: "proceedings",
    label: "Proceedings",
    singular: "Volume",
    description: "Yearly volumes of the proceedings and their contents.",
    idField: "year",
    titleField: "title",
    columns: ["roman", "status"],
    seed: () => SEED_VOLUMES as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "year", label: "Year", required: true, placeholder: "2028", help: "Four digits. Appears in the URL: /proceedings/year." },
      { type: "text", name: "roman", label: "Volume numeral", required: true, placeholder: "III" },
      { type: "text", name: "title", label: "Title", required: true, placeholder: "On …" },
      { type: "select", name: "status", label: "Status", required: true, options: VOLUME_STATUSES },
      { type: "paragraphs", name: "note", label: "Note from the editor", required: true },
      {
        type: "list", name: "papers", label: "Contents", itemLabel: "paper", itemTitle: "title",
        help: "Leave empty to show “Contents will be listed here after the spring colloquium”.",
        fields: [
          { type: "text", name: "title", label: "Title", required: true },
          { type: "text", name: "author", label: "Author", required: true },
          { type: "relation", name: "center", label: "Center", collection: "centers" },
        ],
      },
    ],
  },
  {
    name: "contact",
    label: "Contact",
    singular: "Contact",
    description: "Addresses shown on the fellowship pages.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => [{ id: "contact", fellowshipsEmail: SEED_FELLOWSHIP_EMAIL }],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “contact”." },
      { type: "email", name: "fellowshipsEmail", label: "Fellowships email", required: true, help: "Used by the “Enquire” and “Write to apply” buttons. Update the How-to-apply steps too if they name the address." },
    ],
  },
];

/** Names of the public forms whose submissions land in the inbox. */
export const FORMS: Record<string, string> = {
  "center-proposal": "Center proposals",
};

export function getCollection(name: string): CollectionDef {
  const def = COLLECTIONS.find((c) => c.name === name);
  if (!def) throw new Error(`Unknown collection: ${name}`);
  return def;
}

export const findCollection = (name: string) => COLLECTIONS.find((c) => c.name === name);

/** Extra pages this space's sidebar in cms/web links to. */
export const LINKS: SpaceLink[] = [];
