// Settings from the environment. Everything this service reads from process.env is read here, once.
//
//   PORT                port to listen on
//   CMS_API_URL         base URL of cms/api (http://localhost:4100 in development)
//   CMS_SPACE_KEY       this house's service key for the CMS. Never leaves the server. Holds only
//                       the collective's own trusted ("first-party") OAuth clients.
//   API_PUBLIC_URL      this api's address as the CMS sees it, for the content webhook
//   WEB_URL             base URL of accounts/web, for cache revalidation
//   REVALIDATE_SECRET   shared with the web; sent as x-revalidate-secret
//   MONGODB_URI         this service's own database (itc_accounts). Only this api touches it.
//   ACCOUNTS_DB_NAME    database name (itc_accounts)
//   ACCOUNTS_DB         which database to use: "mongodb" (default)
//   PORTAL_API_URL      portal/api's address. Account creation stays portal's: this api calls its
//                       existing /auth/* login flow and the one read endpoint it exposes for us.
//   PORTAL_WEB_URL      portal/web's address, only for linking out to a person's public profile
//                       (GET /oauth/userinfo's `profile` claim)
//   ACCOUNTS_SERVICE_KEY  the shared key portal/api requires on GET /internal/contributors/:id
//   OAUTH_SIGNING_KEY   the id_token signing key (read directly in oauth/crypto.ts, not here —
//                       same as when this provider lived in portal/api)
//   CONTENT_TTL         seconds to hold a content response in memory (60)
//   REGISTER_SCHEMA     "off" skips schema registration on boot (useful in tests)
//   API_LOG             "off" silences request logs
import { HOUSE } from "./content/house.js";

export interface Config {
  production: boolean;
  port: number;
  /** The house's space id in the CMS. A constant, not an environment setting. */
  space: string;
  cms: { url: string; key: string };
  /** This api's own public address; the CMS posts content webhooks to `${publicUrl}/cms/webhook`. */
  publicUrl: string;
  web: { url: string; revalidateSecret: string };
  /** This service's own data. No other api may read it (ARCHITECTURE.md, rule 2). */
  db: { kind: string; uri?: string; name: string };
  /** portal/api: the only place an ITC account is created, and the only source of profile claims. */
  portal: { apiUrl: string; webUrl: string; serviceKey: string };
  contentTtlMs: number;
  registerSchema: boolean;
  log: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === "production";
  return {
    production,
    port: Number(env.PORT) || HOUSE.port,
    space: HOUSE.space,
    cms: {
      url: (env.CMS_API_URL || "http://localhost:4100").replace(/\/+$/, ""),
      // In development the CMS accepts "dev-<space>-key" for a space that has no key configured,
      // so a house api runs without any secret on a developer's machine.
      key: env.CMS_SPACE_KEY || (production ? "" : `dev-${HOUSE.space}-key`),
    },
    publicUrl: (env.API_PUBLIC_URL || `http://localhost:${Number(env.PORT) || HOUSE.port}`).replace(/\/+$/, ""),
    web: {
      url: (env.WEB_URL || `http://localhost:${HOUSE.webPort}`).replace(/\/+$/, ""),
      revalidateSecret: env.REVALIDATE_SECRET || "",
    },
    db: { kind: (env.ACCOUNTS_DB ?? "mongodb").toLowerCase(), uri: env.MONGODB_URI, name: env.ACCOUNTS_DB_NAME || "itc_accounts" },
    portal: {
      apiUrl: (env.PORTAL_API_URL || "http://localhost:4006").replace(/\/+$/, ""),
      webUrl: (env.PORTAL_WEB_URL || "http://localhost:3006").replace(/\/+$/, ""),
      serviceKey: env.ACCOUNTS_SERVICE_KEY || (production ? "" : "dev-accounts-service-key"),
    },
    contentTtlMs: (Number(env.CONTENT_TTL) || 60) * 1000,
    registerSchema: env.REGISTER_SCHEMA !== "off",
    log: env.API_LOG !== "off",
  };
}
