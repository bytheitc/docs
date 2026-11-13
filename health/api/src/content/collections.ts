// House-specific: the content types ITC Health editors manage.
// Each definition drives the CMS editor's forms, validation and storage; `seed` is today's built-in
// content, which also serves this api's read-only fallback when the CMS is unreachable.
//
// Deliberately small. This house has one page worth having — the idea — and a set of commitments
// it can be held to. Collections for programmes, people and publications belong here when there
// are programmes, people and publications, and not before: an empty "Partners" tab in the Studio
// is an invitation to fill it with something that isn't true yet.
import { BLOCK_KINDS, NOTE_TONES, toEditableSections, type DocPage } from "./doc.js";
import { SEED_IDEA } from "./idea.js";
import { SEED_PRINCIPLES } from "./principles.js";
import type { CollectionDef, SpaceLink } from "./types.js";

const INLINE_HELP = "Inline: `code`, **bold**, [label](https://…).";

const DOC_PAGES: DocPage[] = [
  { slug: "idea", title: "The idea", sections: toEditableSections(SEED_IDEA) },
];

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "docs",
    label: "Pages",
    singular: "Page",
    description: "The long-form pages. Today that is the idea; others join it as the house grows.",
    idField: "slug",
    titleField: "title",
    seed: () => DOC_PAGES as unknown as Record<string, unknown>[],
    fields: [
      { type: "select", name: "slug", label: "Page", required: true, options: DOC_PAGES.map((d) => d.slug), help: "Which page this document is shown on." },
      { type: "text", name: "title", label: "Admin title", required: true },
      {
        type: "list", name: "sections", label: "Sections", itemLabel: "section", itemTitle: "title", required: true,
        fields: [
          { type: "text", name: "id", label: "Anchor", required: true, help: "Used in links, e.g. /idea#commitments. Don't change it lightly." },
          { type: "text", name: "title", label: "Heading", required: true },
          {
            type: "list", name: "blocks", label: "Blocks", itemLabel: "block", itemTitle: "kind",
            fields: [
              { type: "select", name: "kind", label: "Kind", required: true, options: [...BLOCK_KINDS] },
              { type: "textarea", name: "text", label: "Text", rows: 4, help: INLINE_HELP + " Code keeps line breaks.", showWhen: { field: "kind", equals: ["paragraph", "note", "code"] } },
              { type: "lines", name: "items", label: "Items", help: "One per line.", showWhen: { field: "kind", equals: ["list", "steps"] } },
              { type: "text", name: "lang", label: "Code language", help: "E.g. shell.", showWhen: { field: "kind", equals: "code" } },
              { type: "text", name: "title", label: "Code title", help: "The caption above the block.", showWhen: { field: "kind", equals: "code" } },
              { type: "select", name: "tone", label: "Note tone", options: [...NOTE_TONES], showWhen: { field: "kind", equals: "note" } },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "principles",
    label: "Principles",
    singular: "Principle",
    description: "What this house holds itself to. Shown on the home page and quoted on the idea page.",
    idField: "id",
    titleField: "title",
    columns: ["title"],
    seed: () => SEED_PRINCIPLES as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "id", label: "Identifier", required: true, placeholder: "least-data", help: "Permanent. Used as an anchor." },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "textarea", name: "body", label: "Body", required: true, rows: 3, help: "Two sentences at most. A principle that needs a paragraph is a policy." },
    ],
  },
];

/** No public forms yet: there is nothing here to sign up to that would be honest to offer. */
export const FORMS: Record<string, string> = {};

export const findCollection = (name: string) => COLLECTIONS.find((c) => c.name === name);

export const LINKS: SpaceLink[] = [{ label: "The idea", href: "/idea" }];
