// House-specific: the content types ITC AI editors manage.
// Each definition drives the CMS editor's forms, validation and storage; `seed` is today's built-in
// content, which also serves this api's read-only fallback when the CMS is unreachable.
import { SEED_PRINCIPLES } from "./charter.js";
import { SEED_CALLS, SEED_COLLABORATE } from "./collaborate.js";
import { CELL_STATES, EVAL_STATUSES, SEED_BENCHMARKS, SEED_RESULTS } from "./evals.js";
import { SEED_GUIDES } from "./guides.js";
import { SEED_HOME } from "./home.js";
import { HOUSES } from "./houses.js";
import { SEED_MODEL_CARDS } from "./model-cards.js";
import { PROJECT_KINDS, PROJECT_STATUSES, SEED_PROJECTS } from "./projects.js";
import type { CollectionDef, Field, SpaceLink } from "./types.js";

const HOUSE_IDS = HOUSES.map((h) => h.id);
const PENDING_HELP = "Write “pending” (or leave empty) until it is filled from a real, reproducible run. Never estimate.";

const labelValue = (help?: string): Field[] => [
  { type: "text", name: "label", label: "Label", required: true },
  { type: "text", name: "value", label: "Value", help: help ?? PENDING_HELP },
];

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "projects",
    label: "Projects",
    singular: "Project",
    description: "Models, evals, tools, datasets and guides, each held to the charter.",
    idField: "slug",
    titleField: "name",
    columns: ["kind", "status"],
    seed: () => SEED_PROJECTS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Appears in the URL: /projects/<slug>." },
      { type: "text", name: "name", label: "Name", required: true },
      { type: "select", name: "kind", label: "Kind", required: true, options: PROJECT_KINDS },
      { type: "select", name: "status", label: "Status", required: true, options: PROJECT_STATUSES, help: "State it plainly, including when something is still only an idea." },
      { type: "text", name: "tagline", label: "Tagline", required: true },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 3, help: "One or two sentences for cards and the page lede." },
      { type: "paragraphs", name: "body", label: "Body", required: true },
      { type: "lines", name: "goals", label: "Goals", required: true, help: "One per line." },
      { type: "relation", name: "principles", label: "Held to (principles)", collection: "principles", multiple: true, required: true },
      {
        type: "list", name: "houses", label: "Built with", itemLabel: "house", itemTitle: "id",
        help: "Other houses on the project. AI is always listed as the lead.",
        fields: [
          { type: "select", name: "id", label: "House", required: true, options: HOUSE_IDS },
          { type: "text", name: "role", label: "Role", required: true, placeholder: "maintains the open repository" },
        ],
      },
      {
        type: "list", name: "links", label: "Links", itemLabel: "link", itemTitle: "label",
        fields: [
          { type: "text", name: "label", label: "Label", required: true },
          { type: "select", name: "house", label: "Lives at house", required: true, options: HOUSE_IDS },
          { type: "text", name: "note", label: "Note", required: true, help: "What lives there, e.g. “source, issues and roadmap”." },
          { type: "url", name: "url", label: "Address", help: "Leave empty to link to the house's home page until the real page exists." },
        ],
      },
      { type: "relation", name: "modelCard", label: "Model card", collection: "model-cards" },
      { type: "relation", name: "evals", label: "Benchmarks", collection: "benchmarks", multiple: true },
      { type: "relation", name: "guide", label: "Guide", collection: "guides" },
    ],
  },
  {
    name: "benchmarks",
    label: "Benchmarks",
    singular: "Benchmark",
    description: "Open benchmarks on the Evals page. Each tests one principle of the charter.",
    idField: "id",
    titleField: "name",
    columns: ["status", "principle"],
    seed: () => SEED_BENCHMARKS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Used in links (/evals#<id>) and in the results table." },
      { type: "text", name: "name", label: "Name", required: true },
      { type: "textarea", name: "question", label: "Question it asks", required: true, rows: 2 },
      { type: "relation", name: "principle", label: "Principle", collection: "principles", required: true },
      { type: "select", name: "status", label: "Status", required: true, options: EVAL_STATUSES },
      { type: "relation", name: "project", label: "Maintained by project", collection: "projects", required: true },
      {
        type: "list", name: "metrics", label: "Metrics", itemLabel: "metric", itemTitle: "name", required: true,
        fields: [
          { type: "text", name: "name", label: "Metric", required: true },
          { type: "textarea", name: "meaning", label: "Meaning", required: true, rows: 2 },
          { type: "select", name: "better", label: "Better is", required: true, options: ["higher", "lower"] },
          { type: "text", name: "result", label: "Result", help: "Leave empty to show “pending”. Shown only once the run below is linked." },
        ],
      },
      { type: "url", name: "run", label: "Reproducible run", help: "Link to the published run at ITC Research. Metric results stay “pending” until this is set." },
    ],
  },
  {
    name: "results",
    label: "Eval results",
    singular: "Results row",
    description: "Rows of the results table on the Evals page: one system per row, one cell per benchmark.",
    idField: "id",
    titleField: "system",
    columns: ["note"],
    seed: () => SEED_RESULTS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "id", label: "Id", required: true },
      { type: "text", name: "system", label: "System", required: true },
      { type: "text", name: "note", label: "Note", required: true, help: "Shown under the system name, e.g. “in development”." },
      {
        type: "list", name: "cells", label: "Cells", itemLabel: "cell", itemTitle: "benchmark",
        help: "Benchmarks without a cell show “pending”. A value appears only with state “result”, a value and a linked run. Never fill a value that did not come from a reproducible, published run.",
        fields: [
          { type: "relation", name: "benchmark", label: "Benchmark", collection: "benchmarks", required: true },
          { type: "select", name: "state", label: "State", required: true, options: CELL_STATES, help: "“not applicable” is shown as —." },
          { type: "text", name: "value", label: "Value", help: "Only for state “result”." },
          { type: "url", name: "run", label: "Reproducible run", help: "Required before the value is shown." },
        ],
      },
    ],
  },
  {
    name: "model-cards",
    label: "Model cards",
    singular: "Model card",
    description: "One transparency document per model, always in the same six sections.",
    idField: "slug",
    titleField: "name",
    columns: ["kind", "project"],
    seed: () => SEED_MODEL_CARDS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true },
      { type: "text", name: "name", label: "Model name", required: true },
      { type: "text", name: "kind", label: "Kind", required: true, placeholder: "text embedding model", help: "The last word is used as the card's tag." },
      { type: "relation", name: "project", label: "Project", collection: "projects", required: true },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 3 },
      { type: "list", name: "facts", label: "Facts", itemLabel: "fact", itemTitle: "label", help: "A fact labelled “status” is shown on the index card.", fields: labelValue() },
      { type: "lines", name: "intendedUse", label: "Intended use", required: true, help: "One per line." },
      { type: "lines", name: "outOfScope", label: "Out-of-scope use", required: true, help: "One per line." },
      { type: "list", name: "data", label: "Data", itemLabel: "row", itemTitle: "label", fields: labelValue() },
      {
        type: "list", name: "evaluation", label: "Evaluation", itemLabel: "result", itemTitle: "benchmark",
        fields: [
          { type: "text", name: "benchmark", label: "Benchmark", required: true },
          { type: "text", name: "result", label: "Result", help: PENDING_HELP },
        ],
      },
      { type: "lines", name: "limitations", label: "Limitations", required: true, help: "One per line." },
      { type: "email", name: "contact", label: "Contact email", required: true },
    ],
  },
  {
    name: "guides",
    label: "Guides",
    singular: "Guide",
    description: "Adoption guides for mosques, schools and nonprofits. Not legal advice, and no religious rulings.",
    idField: "slug",
    titleField: "title",
    columns: ["audience"],
    seed: () => SEED_GUIDES as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true },
      { type: "text", name: "audience", label: "Audience", required: true, placeholder: "mosques & masjid committees" },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "textarea", name: "dek", label: "Standfirst", required: true, rows: 2 },
      { type: "relation", name: "principles", label: "Grounded in (principles)", collection: "principles", multiple: true },
      {
        type: "list", name: "sections", label: "Sections", itemLabel: "section", itemTitle: "heading", required: true,
        fields: [
          { type: "text", name: "id", label: "Anchor", required: true, help: "Short id for links, e.g. data." },
          { type: "text", name: "heading", label: "Heading", required: true },
          { type: "paragraphs", name: "paragraphs", label: "Paragraphs", required: true },
          { type: "lines", name: "list", label: "Bullet list", help: "Optional. One per line." },
        ],
      },
      { type: "lines", name: "checklist", label: "Checklist", required: true, help: "One item per line." },
    ],
  },
  {
    name: "principles",
    label: "Charter",
    singular: "Principle",
    description: "The principles of the charter, in order. Projects, benchmarks and guides refer to them.",
    idField: "id",
    titleField: "title",
    columns: ["k"],
    seed: () => SEED_PRINCIPLES as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Used in links (/charter#<id>). Changing it breaks references." },
      { type: "text", name: "k", label: "Transliteration", required: true, placeholder: "amānah" },
      { type: "text", name: "arabic", label: "Arabic", required: true, help: "Have a native Arabic speaker check it." },
      { type: "text", name: "sense", label: "Sense", required: true, help: "Plain-English meaning, always shown next to the Arabic." },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 2 },
      { type: "paragraphs", name: "reasoning", label: "Why", required: true },
      { type: "lines", name: "practice", label: "In practice", required: true, help: "One per line." },
      {
        type: "list", name: "enforcement", label: "Enforced at release", itemLabel: "gate", itemTitle: "gate", required: true,
        fields: [
          { type: "text", name: "gate", label: "Gate", required: true },
          { type: "textarea", name: "detail", label: "Detail", required: true, rows: 2 },
        ],
      },
    ],
  },
  {
    name: "calls",
    label: "Open calls",
    singular: "Call",
    description: "Calls for collaborators on the Collaborate page. They are also the choices in the interest form.",
    idField: "id",
    titleField: "title",
    seed: () => SEED_CALLS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, placeholder: "researcher" },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "textarea", name: "lede", label: "Lede", required: true, rows: 2 },
      { type: "lines", name: "youd", label: "You'd", required: true, help: "One per line." },
      { type: "lines", name: "bring", label: "You bring", required: true, help: "One per line." },
    ],
  },
  {
    name: "collaborate",
    label: "Interest form",
    singular: "Interest form",
    description: "Options in the Register interest form.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => [SEED_COLLABORATE as unknown as Record<string, unknown>],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “collaborate”." },
      { type: "lines", name: "interests", label: "Areas of interest", required: true, help: "One per line. Shown as checkboxes." },
    ],
  },
  {
    name: "home",
    label: "Home page",
    singular: "Home page",
    description: "The focus cards and “From the lab” list on the home page.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => [SEED_HOME as unknown as Record<string, unknown>],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “home”." },
      {
        type: "list", name: "focus", label: "Where we focus", itemLabel: "card", itemTitle: "title",
        fields: [
          { type: "text", name: "tag", label: "Tag", required: true },
          { type: "text", name: "title", label: "Title", required: true },
          { type: "textarea", name: "body", label: "Body", required: true, rows: 2 },
          { type: "text", name: "output", label: "Output", required: true, placeholder: "open benchmarks" },
          { type: "text", name: "with", label: "Houses", required: true, placeholder: "AI × Research" },
          { type: "url", name: "href", label: "Link", required: true, placeholder: "/projects/…" },
        ],
      },
      {
        type: "list", name: "lab", label: "From the lab", itemLabel: "item", itemTitle: "title",
        fields: [
          { type: "text", name: "type", label: "Type", required: true, placeholder: "paper, repo, dataset, guide" },
          { type: "text", name: "title", label: "Title", required: true },
          { type: "url", name: "href", label: "Link", required: true },
        ],
      },
    ],
  },
];

/** Names of the public forms whose submissions land in the inbox. */
export const FORMS: Record<string, string> = {
  interest: "Collaborate: register interest",
};

export function getCollection(name: string): CollectionDef {
  const def = COLLECTIONS.find((c) => c.name === name);
  if (!def) throw new Error(`Unknown collection: ${name}`);
  return def;
}

export const findCollection = (name: string) => COLLECTIONS.find((c) => c.name === name);

/** Extra pages this space's sidebar in cms/web links to. */
export const LINKS: SpaceLink[] = [];
