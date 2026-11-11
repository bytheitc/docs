// House-specific: the content types ITC Open Source editors manage.
// Each definition drives the CMS editor's forms, validation and storage; `seed` is today's built-in
// content, which also serves this api's read-only fallback when the CMS is unreachable.
import { SEED_CONDUCT } from "./conduct.js";
import { SEED_CONTRIBUTE } from "./contribute.js";
import { SEED_CONTRIBUTION_KINDS, SEED_CONTRIBUTORS } from "./contributors.js";
import { BLOCK_KINDS, NOTE_TONES, toEditableSections, type DocPage } from "./doc.js";
import { SEED_GOVERNANCE } from "./governance.js";
import { HOUSES } from "./houses.js";
import { LANGS, SEED_REPOS } from "./repos.js";
import { SEED_SETTINGS } from "./site.js";
import { SEED_SPRINTS, SPRINT_STATUSES } from "./sprints.js";
import type { CollectionDef, Field, SpaceLink } from "./types.js";

const INLINE_HELP = "Inline formatting: `code`, **bold**, [label](/path or https://…).";

const snippetFields: Field[] = [
  { type: "text", name: "lang", label: "Language", required: true, placeholder: "shell", help: "Shown in the code block header, e.g. shell, python, ts." },
  { type: "textarea", name: "code", label: "Code", required: true, rows: 8, help: "Line breaks and indentation are kept." },
];

const DOC_PAGES: DocPage[] = [
  { slug: "contribute", title: "Contribute: the first-timer's guide", sections: toEditableSections(SEED_CONTRIBUTE) },
  { slug: "governance", title: "Governance", sections: toEditableSections(SEED_GOVERNANCE) },
  { slug: "code-of-conduct", title: "Code of conduct (adab)", sections: toEditableSections(SEED_CONDUCT) },
];

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "repos",
    label: "Repositories",
    singular: "Repository",
    description:
      "Repos in the commons, with their README overview, snippets, maintainers and good first issues. " +
      "For now this is CMS content; later the contributor portal will supply live repo and issue data.",
    idField: "slug",
    titleField: "name",
    columns: ["lang", "houseId", "license"],
    seed: () => SEED_REPOS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, placeholder: "mizan-ui", help: "Used in /projects/… and in the GitHub repo URL." },
      { type: "text", name: "name", label: "Name", required: true, help: "Shown as itc/<name>." },
      { type: "textarea", name: "desc", label: "One-line description", required: true, rows: 2 },
      { type: "select", name: "lang", label: "Language", required: true, options: LANGS },
      { type: "text", name: "license", label: "Licence", required: true, placeholder: "MIT", help: "SPDX id. OSI-approved licences only." },
      { type: "select", name: "houseId", label: "Owning house", required: true, options: HOUSES.map((h) => h.id), help: "site = the Collective." },
      { type: "paragraphs", name: "overview", label: "README overview", required: true, help: INLINE_HELP },
      { type: "lines", name: "features", label: "Features", help: "One per line." },
      { type: "object", name: "install", label: "Install snippet", required: true, fields: snippetFields },
      { type: "object", name: "usage", label: "Usage snippet", required: true, fields: snippetFields },
      {
        type: "list", name: "maintainers", label: "Maintainers", itemLabel: "maintainer", itemTitle: "role",
        fields: [
          { type: "text", name: "role", label: "Role", required: true },
          { type: "text", name: "name", label: "Name", required: true, help: "“TBA” until a real person signs up." },
        ],
      },
      {
        type: "list", name: "issues", label: "Good first issues", itemLabel: "issue", itemTitle: "title",
        fields: [
          { type: "text", name: "title", label: "Title", required: true },
          { type: "text", name: "label", label: "Label", required: true, placeholder: "docs", help: "e.g. docs, tests, feature, bug, a11y, i18n, dx." },
          { type: "number", name: "number", label: "GitHub issue number", min: 1, help: "Set once the issue exists on GitHub. Turns on “Claim on the portal” and links straight to the issue." },
          { type: "boolean", name: "featured", label: "Feature on the home page" },
        ],
      },
    ],
  },
  {
    name: "sprints",
    label: "Commons Sprints",
    singular: "Sprint",
    description: "Short, focused, time-boxed pushes on one theme.",
    idField: "slug",
    titleField: "title",
    columns: ["code", "status", "dates"],
    seed: () => SEED_SPRINTS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true },
      { type: "text", name: "code", label: "Code", required: true, placeholder: "CS-05" },
      { type: "text", name: "title", label: "Title", required: true, help: "Written in capitals on the site." },
      { type: "select", name: "status", label: "Status", required: true, options: SPRINT_STATUSES },
      { type: "text", name: "dates", label: "Dates", required: true, placeholder: "TBA" },
      { type: "text", name: "format", label: "Format", required: true, placeholder: "Online · 5 days" },
      { type: "text", name: "theme", label: "Theme", required: true },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 3, help: INLINE_HELP },
      { type: "relation", name: "repos", label: "Repos in focus", collection: "repos", multiple: true },
      { type: "lines", name: "goals", label: "Goals", required: true, help: "One per line. " + INLINE_HELP },
      {
        type: "list", name: "schedule", label: "Schedule", itemLabel: "slot", itemTitle: "when",
        fields: [
          { type: "text", name: "when", label: "When", required: true, placeholder: "DAY 0" },
          { type: "textarea", name: "what", label: "What", required: true, rows: 2 },
        ],
      },
      { type: "textarea", name: "outcome", label: "Outcome", rows: 3, help: "Past sprints: what to read. Never invented numbers." },
    ],
  },
  {
    name: "contributors",
    label: "Contributors",
    singular: "Contributor",
    description: "The contributors wall. Add people only for real, merged or recorded contributions, and only with their consent.",
    idField: "handle",
    titleField: "handle",
    columns: ["name"],
    seed: () => SEED_CONTRIBUTORS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "handle", label: "GitHub handle", required: true, help: "Without the @, in lowercase (GitHub handles are case-insensitive)." },
      { type: "text", name: "name", label: "Display name", help: "Optional. Leave empty if they only want their handle shown." },
      { type: "relation", name: "kinds", label: "Contributions", collection: "contribution-kinds", multiple: true, required: true },
      { type: "relation", name: "repos", label: "Repos", collection: "repos", multiple: true },
    ],
  },
  {
    name: "contribution-kinds",
    label: "Contribution kinds",
    singular: "Contribution kind",
    description: "“What counts” on the contributors page.",
    idField: "kind",
    titleField: "label",
    columns: ["body"],
    seed: () => SEED_CONTRIBUTION_KINDS as unknown as Record<string, unknown>[],
    fields: [
      { type: "text", name: "kind", label: "Id", required: true, placeholder: "docs" },
      { type: "text", name: "label", label: "Label", required: true, help: "Written in capitals on the site." },
      { type: "textarea", name: "body", label: "Description", required: true, rows: 2 },
    ],
  },
  {
    name: "docs",
    label: "Guides & policies",
    singular: "Document",
    description: "The long-form pages: the contributing guide, governance and the code of conduct.",
    idField: "slug",
    titleField: "title",
    seed: () => DOC_PAGES as unknown as Record<string, unknown>[],
    fields: [
      { type: "select", name: "slug", label: "Page", required: true, options: DOC_PAGES.map((d) => d.slug), help: "Which page this document is shown on." },
      { type: "text", name: "title", label: "Admin title", required: true },
      {
        type: "list", name: "sections", label: "Sections", itemLabel: "section", itemTitle: "title", required: true,
        fields: [
          { type: "text", name: "id", label: "Anchor", required: true, help: "Used in links, e.g. /governance#rfcs. Don't change it lightly." },
          { type: "text", name: "title", label: "Heading", required: true },
          {
            type: "list", name: "blocks", label: "Blocks", itemLabel: "block", itemTitle: "kind",
            fields: [
              { type: "select", name: "kind", label: "Kind", required: true, options: BLOCK_KINDS },
              { type: "textarea", name: "text", label: "Text", rows: 4, help: INLINE_HELP + " Code keeps line breaks.", showWhen: { field: "kind", equals: ["paragraph", "note", "code"] } },
              { type: "lines", name: "items", label: "Items", help: "One per line.", showWhen: { field: "kind", equals: ["list", "steps"] } },
              { type: "text", name: "lang", label: "Code language", help: "E.g. shell.", showWhen: { field: "kind", equals: "code" } },
              { type: "text", name: "title", label: "Code title", help: "The caption above the block.", showWhen: { field: "kind", equals: "code" } },
              { type: "select", name: "tone", label: "Note colour", options: NOTE_TONES, help: "Defaults to mint.", showWhen: { field: "kind", equals: "note" } },
              {
                type: "list", name: "defs", label: "Definitions", itemLabel: "definition", itemTitle: "k", showWhen: { field: "kind", equals: "definitions" },
                fields: [
                  { type: "text", name: "k", label: "Term", required: true },
                  { type: "textarea", name: "v", label: "Meaning", required: true, rows: 2 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "settings",
    label: "Site settings",
    singular: "Site settings",
    description: "Deployment settings: the GitHub organisation every repo link points to, and contact addresses. Addresses written inside a guide’s text are edited in that guide.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => [SEED_SETTINGS as unknown as Record<string, unknown>],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “settings”." },
      { type: "url", name: "githubOrgUrl", label: "GitHub organisation URL", required: true, placeholder: "https://github.com/itc-oss", help: "Repo links are this URL plus the repo slug." },
      {
        type: "object", name: "contact", label: "Contact addresses",
        fields: [
          { type: "email", name: "conduct", label: "Code of conduct reports", required: true, help: "Reports go to this address only, never to the admin inbox." },
          { type: "email", name: "maintainers", label: "Maintainers", required: true },
          { type: "email", name: "sprints", label: "Sprints", required: true },
        ],
      },
    ],
  },
];

/** Names of the public forms whose submissions land in the inbox. OSS has no public forms. */
export const FORMS: Record<string, string> = {};

export function getCollection(name: string): CollectionDef {
  const def = COLLECTIONS.find((c) => c.name === name);
  if (!def) throw new Error(`Unknown collection: ${name}`);
  return def;
}

export const findCollection = (name: string) => COLLECTIONS.find((c) => c.name === name);

/** Extra pages this space's sidebar in cms/web links to. */
export const LINKS: SpaceLink[] = [];
