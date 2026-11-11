// House-specific: the content types ITC Engineering editors manage.
// Each definition drives the admin forms, validation and storage; `seed` is today's built-in content.
import { POST_KINDS, SEED_POSTS } from "@/lib/blog";
import { ROLE_TYPES, SEED_CAREERS_PAGE, SEED_ROLES } from "@/lib/careers";
import { BLOCK_KINDS, toStoredBlock, toStoredSections } from "@/lib/content";
import { SEED_CHAPTERS } from "@/lib/handbook";
import { SEED_HOME } from "@/lib/home";
import { PHASES, PLATFORM_STATUSES, SEED_PLATFORMS } from "@/lib/platforms";
import { RFC_STATUSES, SEED_RFCS } from "@/lib/rfcs";
import { SEED_STATUS, STATUS_VALUES } from "@/lib/status";
import { SEED_TEAMS } from "@/lib/teams";
import type { CollectionDef, Field } from "@/lib/cms/types";

type Rec = Record<string, unknown>;
const asRecords = <T,>(list: T[]) => list as unknown as Rec[];

/** One block of long-form text. Which fields apply depends on the kind. */
const blockFields: Field[] = [
  {
    type: "select", name: "kind", label: "Kind", required: true, options: BLOCK_KINDS,
    help: "The fields below change with the kind.",
  },
  { type: "textarea", name: "text", label: "Text", rows: 4, showWhen: { field: "kind", equals: ["paragraph", "note", "code"] } },
  { type: "text", name: "label", label: "Note label", help: "Defaults to “Note”.", showWhen: { field: "kind", equals: "note" } },
  { type: "text", name: "caption", label: "Code caption", help: "E.g. a file name.", showWhen: { field: "kind", equals: "code" } },
  { type: "lines", name: "items", label: "List items", help: "One item per line.", showWhen: { field: "kind", equals: "list" } },
  { type: "boolean", name: "ordered", label: "Numbered list", showWhen: { field: "kind", equals: "list" } },
  {
    type: "list", name: "rows", label: "Spec rows", itemLabel: "row", itemTitle: "key",
    showWhen: { field: "kind", equals: "spec" },
    fields: [
      { type: "text", name: "key", label: "Term", required: true },
      { type: "textarea", name: "value", label: "Value", required: true, rows: 2 },
    ],
  },
];

const blocks = (name: string, label: string, required = true): Field =>
  ({ type: "list", name, label, itemLabel: "block", itemTitle: "kind", required, fields: blockFields });

const sectionsField: Field = {
  type: "list", name: "sections", label: "Sections", itemLabel: "section", itemTitle: "title", required: true,
  fields: [
    { type: "text", name: "id", label: "Anchor", required: true, help: "Used in links, e.g. #write-it-down. Lowercase, hyphens." },
    { type: "text", name: "title", label: "Heading", required: true },
    blocks("blocks", "Blocks"),
  ],
};

const teamField: Field = { type: "relation", name: "team", label: "Team", collection: "teams", required: true };

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "platforms",
    label: "Platforms",
    singular: "Platform",
    description: "The shared platform registry: spec sheets, interfaces, dependencies, roadmaps.",
    idField: "slug",
    titleField: "name",
    columns: ["id", "status", "owner"],
    seed: () => asRecords(SEED_PLATFORMS),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Appears in the URL: /platforms/<slug>." },
      { type: "text", name: "id", label: "Registry number", required: true, placeholder: "P-06" },
      { type: "text", name: "name", label: "Name", required: true },
      { type: "text", name: "arabic", label: "Arabic name", required: true, help: "Have a native speaker check it." },
      { type: "text", name: "transliteration", label: "Transliteration", required: true },
      { type: "text", name: "gloss", label: "Meaning", required: true },
      { type: "text", name: "purpose", label: "Purpose", required: true, help: "One line, no full stop." },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 3 },
      { type: "relation", name: "owner", label: "Owning team", collection: "teams", required: true },
      { type: "select", name: "status", label: "Status", required: true, options: PLATFORM_STATUSES },
      { type: "lines", name: "principles", label: "Design principles", help: "One per line." },
      {
        type: "list", name: "interfaces", label: "Interfaces", itemLabel: "interface", itemTitle: "name",
        fields: [
          { type: "text", name: "name", label: "Name", required: true },
          { type: "text", name: "kind", label: "Kind", required: true, placeholder: "HTTP" },
          { type: "text", name: "surface", label: "Surface", required: true, placeholder: "GET /v1/…" },
          { type: "text", name: "note", label: "Note" },
        ],
      },
      {
        type: "list", name: "dependencies", label: "Dependencies", itemLabel: "dependency", itemTitle: "name",
        fields: [
          { type: "text", name: "name", label: "Name", required: true },
          { type: "select", name: "kind", label: "Kind", required: true, options: ["platform", "external"] },
          { type: "relation", name: "ref", label: "Links to platform", collection: "platforms", help: "For platform dependencies." },
          { type: "text", name: "note", label: "Why" },
        ],
      },
      {
        type: "list", name: "roadmap", label: "Roadmap", itemLabel: "milestone", itemTitle: "title",
        fields: [
          { type: "select", name: "phase", label: "Phase", required: true, options: PHASES },
          { type: "text", name: "title", label: "Title", required: true },
          { type: "text", name: "note", label: "Note" },
        ],
      },
      {
        type: "object", name: "runbook", label: "Runbook",
        fields: [
          { type: "text", name: "path", label: "Path", placeholder: "runbooks/…" },
          { type: "lines", name: "covers", label: "Covers", help: "One topic per line." },
        ],
      },
    ],
  },
  {
    name: "handbook",
    label: "Handbook",
    singular: "Chapter",
    description: "Handbook chapters: the standard every engineer and volunteer is held to.",
    idField: "slug",
    titleField: "title",
    columns: ["num", "owner", "revision"],
    seed: () => asRecords(SEED_CHAPTERS.map((c) => ({ ...c, sections: toStoredSections(c.sections) }))),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true },
      { type: "text", name: "num", label: "Chapter number", required: true, placeholder: "H-08" },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 2 },
      { type: "relation", name: "owner", label: "Owning team", collection: "teams", required: true },
      { type: "text", name: "revision", label: "Revision", required: true, placeholder: "rev. 0.1 · draft" },
      sectionsField,
    ],
  },
  {
    name: "rfcs",
    label: "RFCs",
    singular: "RFC",
    description: "Public design decisions, with the reasoning.",
    idField: "id",
    titleField: "title",
    columns: ["status", "team", "date"],
    seed: () => asRecords(SEED_RFCS.map((r) => ({
      ...r,
      motivation: r.motivation.map(toStoredBlock),
      design: r.design.map(toStoredBlock),
      alternatives: r.alternatives.map(toStoredBlock),
      decision: r.decision.map(toStoredBlock),
    }))),
    fields: [
      { type: "text", name: "id", label: "Number", required: true, placeholder: "0007", help: "Four digits. Shown as RFC-0007. Never reuse a number." },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "select", name: "status", label: "Status", required: true, options: RFC_STATUSES },
      teamField,
      { type: "text", name: "date", label: "Date", help: "Leave empty to show “—”." },
      { type: "relation", name: "platforms", label: "Platforms", collection: "platforms", multiple: true, help: "Leave empty for cross-cutting decisions." },
      { type: "textarea", name: "summary", label: "Summary", required: true, rows: 3 },
      blocks("motivation", "Motivation"),
      blocks("design", "Design"),
      blocks("alternatives", "Alternatives"),
      blocks("decision", "Decision"),
      { type: "relation", name: "supersededBy", label: "Superseded by", collection: "rfcs" },
    ],
  },
  {
    name: "blog",
    label: "Blog",
    singular: "Post",
    description: "Write-ups and blameless incident reviews.",
    idField: "slug",
    titleField: "title",
    columns: ["num", "kind", "date"],
    seed: () => asRecords(SEED_POSTS.map((p) => ({
      ...p,
      ...(p.facts ? { facts: p.facts.map(([label, value]) => ({ label, value })) } : {}),
      sections: toStoredSections(p.sections),
    }))),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true },
      { type: "text", name: "num", label: "Number", required: true, placeholder: "B-05" },
      { type: "select", name: "kind", label: "Kind", required: true, options: POST_KINDS },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "textarea", name: "dek", label: "Standfirst", required: true, rows: 2 },
      teamField,
      { type: "text", name: "date", label: "Date", help: "Leave empty to show “—”." },
      { type: "relation", name: "platforms", label: "Platforms", collection: "platforms", multiple: true },
      {
        type: "list", name: "facts", label: "Incident fact sheet", itemLabel: "fact", itemTitle: "label",
        help: "Incident reviews only. Use “—” for values that are not known.",
        fields: [
          { type: "text", name: "label", label: "Label", required: true },
          { type: "text", name: "value", label: "Value", required: true },
        ],
      },
      sectionsField,
    ],
  },
  {
    name: "teams",
    label: "Teams",
    singular: "Team",
    description: "Engineering teams, their scope and how to reach them.",
    idField: "slug",
    titleField: "name",
    columns: ["code", "summary"],
    seed: () => asRecords(SEED_TEAMS),
    fields: [
      { type: "text", name: "slug", label: "Slug", required: true, help: "Platforms, chapters, RFCs and roles refer to teams by this." },
      { type: "text", name: "code", label: "Code", required: true, placeholder: "PLT", help: "Three capitals." },
      { type: "text", name: "name", label: "Name", required: true },
      { type: "text", name: "summary", label: "Summary", required: true },
      { type: "textarea", name: "mission", label: "Mission", required: true, rows: 3 },
      { type: "lines", name: "scope", label: "In scope", help: "One per line." },
      { type: "lines", name: "notScope", label: "Not in scope", help: "One per line." },
      {
        type: "list", name: "reach", label: "How to reach us", itemLabel: "channel", itemTitle: "channel",
        help: "The first channel is shown in the team directory.",
        fields: [
          { type: "text", name: "channel", label: "Channel", required: true, placeholder: "Email" },
          { type: "text", name: "value", label: "Address", required: true },
          { type: "url", name: "href", label: "Link", help: "Optional, e.g. mailto:team@example.org." },
          { type: "text", name: "note", label: "Use it for" },
        ],
      },
      {
        type: "list", name: "rhythm", label: "Working rhythm", itemLabel: "ritual", itemTitle: "name",
        fields: [
          { type: "text", name: "name", label: "Name", required: true },
          { type: "textarea", name: "detail", label: "Detail", required: true, rows: 2 },
        ],
      },
    ],
  },
  {
    name: "roles",
    label: "Open roles",
    singular: "Role",
    description: "Roles listed on the careers page, including volunteer roles.",
    idField: "id",
    titleField: "title",
    columns: ["team", "type", "location"],
    seed: () => asRecords(SEED_ROLES),
    fields: [
      { type: "text", name: "id", label: "Role id", required: true, placeholder: "r-08", help: "Lowercase; shown in capitals (R-08). Applicants quote it." },
      { type: "text", name: "title", label: "Title", required: true },
      teamField,
      { type: "select", name: "type", label: "Type", required: true, options: ROLE_TYPES },
      { type: "text", name: "location", label: "Location", required: true },
      { type: "text", name: "summary", label: "Summary", required: true },
    ],
  },
  {
    name: "careers",
    label: "Careers page",
    singular: "Careers page",
    description: "How hiring and volunteering work, and where applications go.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => [SEED_CAREERS_PAGE as unknown as Rec],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “careers”." },
      { type: "email", name: "email", label: "Careers email", required: true },
      {
        type: "list", name: "hiring", label: "How hiring works", itemLabel: "step", itemTitle: "title", required: true,
        fields: [
          { type: "text", name: "title", label: "Step", required: true },
          { type: "textarea", name: "body", label: "Description", required: true, rows: 2 },
        ],
      },
      {
        type: "list", name: "volunteering", label: "Volunteering", itemLabel: "step", itemTitle: "title", required: true,
        fields: [
          { type: "text", name: "title", label: "Step", required: true },
          { type: "textarea", name: "body", label: "Description", required: true, rows: 2 },
        ],
      },
    ],
  },
  {
    name: "status",
    label: "Status sheet",
    singular: "Status sheet",
    description: "Platform readings and incident history. No monitoring is connected: enter measured values only.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => [SEED_STATUS as unknown as Rec],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “status”." },
      { type: "text", name: "feed", label: "Feed", required: true, help: "E.g. “not connected”, or the monitoring source once connected." },
      { type: "text", name: "lastChecked", label: "Last checked", help: "Leave empty to show “—”." },
      { type: "text", name: "openIncidents", label: "Open incidents", help: "Leave empty to show “—”." },
      { type: "textarea", name: "banner", label: "Warning banner", rows: 2, help: "Shown above the readings. Clear it once the page shows real data." },
      {
        type: "list", name: "readings", label: "Platform readings", itemLabel: "reading", itemTitle: "platform",
        help: "Platforms without a reading show “no data”. Enter measured values only; never estimate uptime.",
        fields: [
          { type: "relation", name: "platform", label: "Platform", collection: "platforms", required: true },
          { type: "select", name: "current", label: "Current", required: true, options: STATUS_VALUES },
          { type: "text", name: "uptime", label: "Uptime (90 days)", placeholder: "e.g. 99.95%", help: "Leave empty to show “—”." },
          { type: "text", name: "lastIncident", label: "Last incident", help: "Leave empty to show “—”." },
        ],
      },
      {
        type: "list", name: "incidents", label: "Incident history", itemLabel: "incident", itemTitle: "title",
        fields: [
          { type: "text", name: "date", label: "Date", required: true },
          { type: "text", name: "title", label: "Title", required: true },
          { type: "text", name: "severity", label: "Severity", placeholder: "SEV-2" },
          { type: "textarea", name: "summary", label: "Summary", rows: 2 },
          { type: "url", name: "href", label: "Review link", placeholder: "/blog/…" },
        ],
      },
    ],
  },
  {
    name: "home",
    label: "Title sheet",
    singular: "Title sheet",
    description: "Home-page practice summaries and the stack list.",
    idField: "id",
    titleField: "id",
    singleton: true,
    seed: () => [SEED_HOME as unknown as Rec],
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “home”." },
      {
        type: "list", name: "practices", label: "Practice summaries", itemLabel: "summary", itemTitle: "section",
        help: "One line for each section of the practices chapter (H-01), keyed by the section's anchor.",
        fields: [
          { type: "text", name: "section", label: "Section anchor", required: true, placeholder: "write-it-down" },
          { type: "textarea", name: "summary", label: "Summary", required: true, rows: 2 },
        ],
      },
      {
        type: "list", name: "stack", label: "Stack", itemLabel: "group", itemTitle: "group",
        fields: [
          { type: "text", name: "group", label: "Group", required: true },
          { type: "tags", name: "items", label: "Items", required: true, help: "Comma-separated." },
        ],
      },
    ],
  },
];

/** Names of the public forms whose submissions land in the inbox. */
export const FORMS: Record<string, string> = {
  "careers-apply": "Careers application",
};

export function getCollection(name: string): CollectionDef {
  const def = COLLECTIONS.find((c) => c.name === name);
  if (!def) throw new Error(`Unknown collection: ${name}`);
  return def;
}

export const findCollection = (name: string) => COLLECTIONS.find((c) => c.name === name);

/** Extra admin pages to show in the sidebar. */
export const ADMIN_LINKS: import("@/lib/cms/types").AdminLink[] = [];
