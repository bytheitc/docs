// Built-in content: served read-only when the CMS is unreachable (ARCHITECTURE.md, rule 5), and
// used to seed the collection the first time the CMS sees it.
import type { ClientDef } from "../oauth/clients.js";

/**
 * The collective's own first-party clients, carried over from when "Sign in with ITC" lived in
 * `portal/api`. These are trusted: they skip the consent screen. Nothing here is a partner app —
 * those register themselves (see routes/partners.ts).
 */
export const SEED_OAUTH_CLIENTS: ClientDef[] = [
  {
    clientId: "itc-mobile",
    name: "ITC (the contributor app)",
    type: "public",
    redirectUris: ["itc://auth"],
    allowedScopes: ["openid", "profile", "contributions", "entitlements", "offline_access"],
    trusted: true,
    active: true,
  },
];
