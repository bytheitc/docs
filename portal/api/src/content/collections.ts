// House-specific: the content and configuration the portal's admins manage through the CMS.
// Contributor data (accounts, contributions, claims, sync runs) is not CMS content: it lives in `portal_*`
// collections behind PortalStore and is managed at /admin/portal.
import { HOUSES } from "./houses.js";
import { PROVIDER_IDS } from "../providers/index.js";
import { CONTRIBUTION_KINDS } from "../providers/types.js";
import { MILESTONE_RULES, SEED_FAQ, SEED_LANDING, SEED_MILESTONES, SEED_OAUTH_CLIENTS, SEED_SETTINGS, SEED_SOURCES } from "./seed.js";
import type { CollectionDef, SpaceLink } from "./types.js";

const HOUSE_IDS = HOUSES.map((h) => h.id);
const rows = <T,>(x: T[]) => x as unknown as Record<string, unknown>[];

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "sources",
    label: "Tracked sources",
    singular: "Source",
    description: "Where contributions are synced from, and which house they count towards. Run syncs at /admin/portal/sync.",
    idField: "id",
    titleField: "label",
    columns: ["provider", "owner", "house", "active"],
    seed: () => rows(SEED_SOURCES),
    fields: [
      { type: "text", name: "id", label: "Id", required: true, placeholder: "github-oss" },
      { type: "text", name: "label", label: "Label", required: true },
      { type: "select", name: "provider", label: "Provider", required: true, options: PROVIDER_IDS },
      { type: "text", name: "owner", label: "Owner", help: "GitHub/Codeberg org or user, GitLab group, Hugging Face org, Crowdin numeric project id, or a wiki’s domain (en.wikipedia.org). Leave empty for ORCID." },
      { type: "text", name: "repo", label: "Repository / project", help: "Optional: limit to one repository, project or model. For Crowdin, the project identifier in its URL." },
      { type: "text", name: "page", label: "Wiki pages", help: "Wikimedia only: page titles separated by |" },
      { type: "url", name: "baseUrl", label: "API base URL", help: "Optional: a self-hosted GitLab or Forgejo instance, e.g. https://git.example.org" },
      { type: "select", name: "house", label: "Counts towards house", required: true, options: HOUSE_IDS },
      { type: "boolean", name: "active", label: "Active", help: "Only published, active sources are synced." },
      { type: "textarea", name: "notes", label: "Notes", rows: 2 },
    ],
  },
  {
    name: "milestones",
    label: "Milestones",
    singular: "Milestone",
    description: "Private recognition shown only to the contributor who reached it. Never points, never ranked.",
    idField: "id",
    titleField: "title",
    columns: ["rule", "threshold"],
    seed: () => rows(SEED_MILESTONES),
    fields: [
      { type: "text", name: "id", label: "Id", required: true },
      { type: "text", name: "title", label: "Title", required: true },
      { type: "textarea", name: "description", label: "Description", required: true, rows: 2 },
      {
        type: "select", name: "rule", label: "Reached when", required: true, options: MILESTONE_RULES,
        help: "contributions: total count · merged: merged PRs/MRs · houses: distinct houses · providers: distinct platforms · kind: count of one kind · verified-self: confirmed self-logged entries",
      },
      { type: "number", name: "threshold", label: "Threshold", required: true, min: 1, max: 10000 },
      { type: "select", name: "kind", label: "Kind (for the “kind” rule)", options: CONTRIBUTION_KINDS },
    ],
  },
  {
    name: "landing",
    label: "Landing page",
    singular: "Landing page",
    singleton: true,
    idField: "id",
    titleField: "headline",
    seed: () => rows(SEED_LANDING),
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “landing”." },
      { type: "text", name: "headline", label: "Headline", required: true },
      { type: "textarea", name: "intro", label: "Introduction", required: true, rows: 3 },
      { type: "list", name: "steps", label: "How connecting works", itemLabel: "step", itemTitle: "title", fields: [
        { type: "text", name: "title", label: "Title", required: true },
        { type: "textarea", name: "body", label: "Body", required: true, rows: 2 },
      ] },
      { type: "paragraphs", name: "privacy", label: "Privacy promise", required: true },
      { type: "textarea", name: "wallIntro", label: "Contributors wall introduction", rows: 2 },
    ],
  },
  {
    name: "faq",
    label: "FAQ",
    singular: "Question",
    idField: "id",
    titleField: "question",
    seed: () => rows(SEED_FAQ),
    fields: [
      { type: "text", name: "id", label: "Id", required: true },
      { type: "text", name: "question", label: "Question", required: true },
      { type: "textarea", name: "answer", label: "Answer", required: true, rows: 4 },
    ],
  },
  {
    name: "settings",
    label: "Portal settings",
    singular: "Settings",
    singleton: true,
    idField: "id",
    titleField: "id",
    seed: () => rows(SEED_SETTINGS),
    fields: [
      { type: "text", name: "id", label: "Id", required: true, help: "Leave as “settings”." },
      { type: "number", name: "claimDays", label: "Claim expiry (days)", required: true, min: 1, max: 90, help: "How long an issue claim lasts before it is released." },
      { type: "textarea", name: "goodFirstIssues", label: "Good first issues note", rows: 2, help: "Shown on the dashboard until suggestions are wired to the Open Source house." },
    ],
  },
  {
    name: "oauth-clients",
    label: "Sign in with ITC",
    singular: "Client",
    description: "Applications allowed to sign people in with their ITC account. Redirect URIs are matched exactly \u2014 no wildcards \u2014 and a confidential client stores only the SHA-256 of its secret, never the secret itself.",
    idField: "clientId",
    titleField: "name",
    seed: () => rows(SEED_OAUTH_CLIENTS),
    fields: [
      { type: "text", name: "clientId", label: "Client id", required: true, placeholder: "itc-mobile" },
      { type: "text", name: "name", label: "Name", required: true, help: "Shown to the person on the consent screen." },
      { type: "select", name: "type", label: "Type", required: true, options: ["public", "confidential"], help: "Public: anything installed on a device or running in a browser, which cannot keep a secret. Confidential: a server that can." },
      { type: "text", name: "secretHash", label: "Client secret (SHA-256)", help: "Confidential clients only. Store the hash, never the secret." },
      { type: "lines", name: "redirectUris", label: "Redirect URIs", required: true, help: "One per line, matched exactly. https anywhere; http only on localhost; a private scheme such as itc://auth for installed apps." },
      { type: "tags", name: "allowedScopes", label: "Allowed scopes", help: "openid, profile, contributions, entitlements, offline_access. openid is always granted." },
      { type: "boolean", name: "trusted", label: "First-party", help: "Skips the consent screen. Only for applications the Collective itself ships." },
      { type: "url", name: "homepage", label: "Homepage", help: "Where someone can find out what this application is." },
      { type: "boolean", name: "active", label: "Active", help: "An inactive client is treated as if it does not exist." },
    ],
  },
];

/** Names of the public forms whose submissions land in the inbox. */
export const FORMS: Record<string, string> = {
  "issue-claim": "Issue claims (assign manually)",
};

export function getCollection(name: string): CollectionDef {
  const def = COLLECTIONS.find((c) => c.name === name);
  if (!def) throw new Error(`Unknown collection: ${name}`);
  return def;
}

export const findCollection = (name: string) => COLLECTIONS.find((c) => c.name === name);

/**
 * Extra pages this space's sidebar in cms/web links to. A path is resolved against the portal web's
 * public URL when the schema is registered; the staff tools check the same CMS account that opened it.
 */
export const LINKS: SpaceLink[] = [{ href: "/staff", label: "Contributor portal tools", role: "editor" }];
