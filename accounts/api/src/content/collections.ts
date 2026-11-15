// House-specific: the content and configuration accounts' staff manage through the CMS.
// Everything else this service owns (sessions, credentials, tokens, grants, partner clients) lives
// in `accounts_*` collections behind AccountsStore, not here.
import { SEED_OAUTH_CLIENTS } from "./seed.js";
import type { CollectionDef, SpaceLink } from "./types.js";

const rows = <T,>(x: T[]) => x as unknown as Record<string, unknown>[];

export const COLLECTIONS: CollectionDef[] = [
  {
    name: "oauth-clients",
    label: "Trusted clients",
    singular: "Client",
    description: "The collective's own first-party applications, allowed to sign people in with their ITC account without a consent screen. Redirect URIs are matched exactly — no wildcards — and a confidential client stores only the SHA-256 of its secret, never the secret itself. Anything else registers itself at /developers.",
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

/** Names of the public forms whose submissions land in the inbox. None yet. */
export const FORMS: Record<string, string> = {};

export const LINKS: SpaceLink[] = [];

export function findCollection(name: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.name === name);
}
