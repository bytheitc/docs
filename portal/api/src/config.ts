// Settings from the environment. Everything this service reads from process.env is read here, once.
//
//   PORT                port to listen on
//   CMS_API_URL         base URL of cms/api (http://localhost:4100 in development)
//   CMS_SPACE_KEY       this house's service key for the CMS. Never leaves the server.
//   API_PUBLIC_URL      this api's address as the CMS sees it, for the content webhook
//   WEB_URL             base URL of this house's web, for cache revalidation
//   REVALIDATE_SECRET   shared with the web; sent as x-revalidate-secret
//   MONGODB_URI         the portal's own database (itc_portal). Only this api touches it.
//   PORTAL_DB_NAME      database name (itc_portal)
//   PORTAL_DB           which database to use: "mongodb" (default)
//   CLAIM_SWEEP_MINUTES   how often to release claims past their date (15; 0 = off)
//   SYNC_INTERVAL_MINUTES how often to sync every active source (0 = off)
//   GOVERNANCE_SWEEP_MINUTES  how often to carry nominations and retire inactive maintainers (60)
//   CONTENT_TTL         seconds to hold a content response in memory (60)
//   REGISTER_SCHEMA     "off" skips schema registration on boot (useful in tests)
//   API_LOG             "off" silences request logs
//   ACCOUNTS_SERVICE_KEY  required on GET /internal/contributors/:id. Shared with accounts/api,
//                       which is the only caller: "Sign in with ITC" moved there, and it needs a
//                       live read of a contributor's profile for every id_token and userinfo call.
import { HOUSE } from "./content/house.js";
import { serverless } from "./cron.js";

export interface Config {
  production: boolean;
  port: number;
  /** The house's space id in the CMS. A constant, not an environment setting. */
  space: string;
  cms: { url: string; key: string };
  /** This api's own public address; the CMS posts content webhooks to `${publicUrl}/cms/webhook`. */
  publicUrl: string;
  web: { url: string; revalidateSecret: string };
  /** The portal's own data. No other api may read it (ARCHITECTURE.md, rule 2). */
  db: { kind: string; uri?: string; name: string };
  contentTtlMs: number;
  /** Work this api does on its own clock. One instance should run it; set both to 0 on the others. */
  jobs: { claimSweepMs: number; syncIntervalMs: number; governanceSweepMs: number };
  registerSchema: boolean;
  log: boolean;
  /** Shared with accounts/api. Empty means the internal endpoint refuses every caller. */
  accountsServiceKey: string;
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
    db: { kind: (env.PORTAL_DB ?? "mongodb").toLowerCase(), uri: env.MONGODB_URI, name: env.PORTAL_DB_NAME || "itc_portal" },
    contentTtlMs: (Number(env.CONTENT_TTL) || 60) * 1000,
    jobs: {
      // On a serverless host the timers default to off: Vercel Cron calls /cron/* instead (cron.ts).
      claimSweepMs: (env.CLAIM_SWEEP_MINUTES === undefined ? (serverless(env) ? 0 : 15) : Number(env.CLAIM_SWEEP_MINUTES) || 0) * 60_000,
      syncIntervalMs: (Number(env.SYNC_INTERVAL_MINUTES) || 0) * 60_000,
      governanceSweepMs: (env.GOVERNANCE_SWEEP_MINUTES === undefined ? (serverless(env) ? 0 : 60) : Number(env.GOVERNANCE_SWEEP_MINUTES) || 0) * 60_000,
    },
    registerSchema: env.REGISTER_SCHEMA !== "off",
    log: env.API_LOG !== "off",
    accountsServiceKey: env.ACCOUNTS_SERVICE_KEY || (production ? "" : "dev-accounts-service-key"),
  };
}
