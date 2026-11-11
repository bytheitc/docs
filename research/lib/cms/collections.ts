// House-specific: the content types ITC Research editors manage.
// Each definition drives the admin forms, validation and storage; `seed` is today's built-in content.
import { SEED_DATASETS } from "@/lib/datasets";
import { SEED_GROUPS, SEED_OFFICE } from "@/lib/groups";
import { HOUSES } from "@/lib/houses";
import { SEED_NOTES } from "@/lib/notes";
import { SEED_POLICIES } from "@/lib/policies";
import { GROUP_NAMES, PUB_TYPES, SEED_PUBLICATIONS } from "@/lib/publications";
import type { CollectionDef, Field } from "@/lib/cms/types";

const roleFields: Field[] = [
  { type: "text", name: "role", label: "Role", required: true },
  { type: "text", name: "name", label: "Name", required: true, help: "Use “Name to be announced” until the person has agreed to be listed." },
  { type: "text", name: "note", label: "Note" },
];

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "publications",
    label: "Publications",
    singular: "Publication",
    description: "Papers, reports, working notes and dataset releases.",
    idField: "id",
    titleField: "title",
    columns: ["type", "group", "year"],
    seed: () => SEED_PUBLICATIONS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "id", label: "Identifier", required: true, placeholder: "itc-r-009", help: "Permanent. Appears in URLs and citations." },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "select", name: "type", label: "Type", required: true, options: PUB_TYPES },
      { type: "select", name: "group", label: "Group", required: true, options: GROUP_NAMES },
      { type: "number", name: "year", label: "Year", required: true, min: 1900, max: 2100 },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 3, help: "One or two sentences for index pages." },
      { type: "paragraphs", name: "abstract", label: "Abstract", required: true },
      { type: "tags", name: "tags", label: "Tags", help: "Short labels shown on cards, comma-separated." },
      { type: "tags", name: "keywords", label: "Keywords", help: "Comma-separated; used for related publications." },
      { type: "tags", name: "with", label: "Done with houses", help: "Display names, e.g. AI, Institute." },
      { type: "text", name: "repo", label: "Code repository", placeholder: "itc-research/…" },
      { type: "relation", name: "dataset", label: "Datasheet", collection: "datasets" },
    ],
  },
  {
    name: "datasets",
    label: "Datasets",
    singular: "Dataset",
    description: "Datasheets: motivation, composition, consent, uses, distribution.",
    idField: "slug",
    titleField: "title",
    columns: ["status", "group"],
    seed: () => SEED_DATASETS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "select", name: "group", label: "Group", required: true, options: GROUP_NAMES },
      { type: "select", name: "status", label: "Release status", required: true, options: ["Released", "In preparation", "Not released"] },
      { type: "text", name: "version", label: "Version", help: "Leave empty to show “pending”." },
      { type: "text", name: "licence", label: "Licence", help: "Leave empty to show “pending”." },
      { type: "relation", name: "pubId", label: "Described in", collection: "publications" },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 3 },
      {
        type: "list", name: "sections", label: "Datasheet sections", itemLabel: "section", itemTitle: "title",
        fields: [
          { type: "text", name: "key", label: "Key", required: true, help: "Anchor id, e.g. motivation." },
          { type: "text", name: "title", label: "Title", required: true },
          {
            type: "list", name: "items", label: "Questions", itemLabel: "question", itemTitle: "q",
            fields: [
              { type: "text", name: "q", label: "Question", required: true },
              { type: "textarea", name: "a", label: "Answer", rows: 3, help: "Leave empty to show “pending”." },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "notes",
    label: "Working notes",
    singular: "Note",
    description: "Essays and working notes.",
    idField: "slug",
    titleField: "title",
    columns: ["group", "date"],
    seed: () => SEED_NOTES as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "textarea", name: "dek", label: "Standfirst", required: true, rows: 2 },
      { type: "select", name: "group", label: "Group", required: true, options: [...GROUP_NAMES, "Editorial"] },
      { type: "date", name: "date", label: "Date", required: true },
      { type: "number", name: "readingMinutes", label: "Reading time (minutes)", required: true, min: 1, max: 120 },
      {
        type: "list", name: "sections", label: "Sections", itemLabel: "section", itemTitle: "heading",
        fields: [
          { type: "text", name: "heading", label: "Heading" },
          { type: "paragraphs", name: "paragraphs", label: "Paragraphs", required: true },
        ],
      },
      { type: "relation", name: "related", label: "Discusses publications", collection: "publications", multiple: true },
    ],
  },
  {
    name: "groups",
    label: "Research groups",
    singular: "Group",
    idField: "slug",
    titleField: "name",
    columns: ["focus"],
    seed: () => SEED_GROUPS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true },
      { type: "select", name: "name", label: "Group", required: true, options: GROUP_NAMES, help: "Group names are fixed in code because publications refer to them." },
      { type: "text", name: "focus", label: "Focus", required: true },
      { type: "paragraphs", name: "agenda", label: "Agenda", required: true },
      { type: "lines", name: "questions", label: "Open questions", help: "One per line." },
      {
        type: "list", name: "collaborators", label: "Works with", itemLabel: "house", itemTitle: "house",
        fields: [
          { type: "select", name: "house", label: "House", required: true, options: HOUSES.map((h) => h.id) },
          { type: "textarea", name: "how", label: "How", required: true, rows: 2 },
        ],
      },
      { type: "list", name: "roles", label: "Roles", itemLabel: "role", itemTitle: "role", fields: roleFields },
    ],
  },
  {
    name: "policies",
    label: "Open-science policies",
    singular: "Policy",
    idField: "slug",
    titleField: "title",
    seed: () => SEED_POLICIES as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "textarea", name: "lede", label: "Lede", required: true, rows: 2 },
      { type: "paragraphs", name: "clauses", label: "Clauses", required: true },
    ],
  },
  {
    name: "office",
    label: "Editorial office",
    singular: "Editorial office",
    description: "Research-wide roles listed on the People page.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => [{ id: "office", roles: SEED_OFFICE }],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “office”." },
      { type: "list", name: "roles", label: "Roles", itemLabel: "role", itemTitle: "role", fields: roleFields },
    ],
  },
];

/** Names of the public forms whose submissions land in the inbox. */
export const FORMS: Record<string, string> = {};

export function getCollection(name: string): CollectionDef {
  const def = COLLECTIONS.find((c) => c.name === name);
  if (!def) throw new Error(`Unknown collection: ${name}`);
  return def;
}

export const findCollection = (name: string) => COLLECTIONS.find((c) => c.name === name);

/** Extra admin pages to show in the sidebar. */
export const ADMIN_LINKS: import("@/lib/cms/types").AdminLink[] = [];
