// Settings from the environment. Everything this service reads from process.env is read here, once.
//
//   PORT                port to listen on
//   CMS_API_URL         base URL of cms/api (http://localhost:4100 in development)
//   CMS_SPACE_KEY       this house's service key for the CMS. Used only to let staff sign in
//                       (there are no content collections here) — see cms.ts.
//   API_PUBLIC_URL      this api's public address: where the mail provider posts bounce and
//                       complaint webhooks (see routes/webhooks.ts)
//   WEB_URL             base URL of email/web, for links in sent mail and the unsubscribe page
//   MONGODB_URI         this service's own database (itc_email). Only this api touches it.
//   EMAIL_DB_NAME       database name (itc_email)
//   EMAIL_DB            which database to use: "mongodb" (default)
//   MAIL_PROVIDER       log (default) | resend | postmark | none — see mail.ts
//   MAIL_API_KEY        the provider's key
//   MAIL_FROM           "ITC <hello@example.org>"
//   MAIL_REPLY_TO       optional
//   POSTMARK_BROADCAST_STREAM  Postmark stream for campaign mail ("broadcast")
//   MAIL_WEBHOOK_SECRET  authenticates bounce/complaint webhooks from the provider
//   EMAIL_SERVICE_KEYS  "house:key,house:key" — the houses allowed to send transactional mail
//                       through POST /transactional, each with its own key
//   SEND_BUDGET_SECONDS seconds one invocation may send before handing back (240 on serverless, else no limit)
//   SEND_DELAY_MS       pause between messages in a campaign send, to stay under the provider's
//                       rate limit (600ms default: under 2/sec, safe for Resend's free tier)
//   CONTENT_TTL         unused here (no content reads), kept for parity
//   REGISTER_SCHEMA     "off" skips schema registration on boot (useful in tests)
//   API_LOG             "off" silences request logs
import { serverless } from "./cron.js";

import { HOUSE } from "./content/house.js";
import { loadMailConfig, type MailConfig } from "./mail.js";

export interface Config {
  production: boolean;
  port: number;
  /** The house's space id in the CMS. A constant, not an environment setting. */
  space: string;
  cms: { url: string; key: string };
  publicUrl: string;
  web: { url: string };
  /** This service's own data. No other api may read it (ARCHITECTURE.md, rule 2). */
  db: { kind: string; uri?: string; name: string };
  mail: MailConfig;
  /** key -> calling house, for POST /transactional. */
  serviceKeys: Map<string, string>;
  sendDelayMs: number;
  /** How long one invocation may keep sending before handing the campaign back (0 = no limit). */
  sendBudgetMs: number;
  /** Unused here (no content reads), kept so cms.ts stays identical to every other house's. */
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
      key: env.CMS_SPACE_KEY || (production ? "" : `dev-${HOUSE.space}-key`),
    },
    publicUrl: (env.API_PUBLIC_URL || `http://localhost:${Number(env.PORT) || HOUSE.port}`).replace(/\/+$/, ""),
    web: { url: (env.WEB_URL || `http://localhost:${HOUSE.webPort}`).replace(/\/+$/, "") },
    db: { kind: (env.EMAIL_DB ?? "mongodb").toLowerCase(), uri: env.MONGODB_URI, name: env.EMAIL_DB_NAME || "itc_email" },
    mail: loadMailConfig(env),
    serviceKeys: parseServiceKeys(env.EMAIL_SERVICE_KEYS),
    sendDelayMs: Number(env.SEND_DELAY_MS) || 600,
    // A serverless function is killed at its max duration (300 s by default on Vercel). A send that
    // stops itself a little before that hands the campaign back cleanly; one that is killed leaves
    // its in-flight recipient marked failed. The cron resumes either way.
    sendBudgetMs: (env.SEND_BUDGET_SECONDS !== undefined ? Number(env.SEND_BUDGET_SECONDS) || 0 : serverless(env) ? 240 : 0) * 1000,
    contentTtlMs: (Number(env.CONTENT_TTL) || 60) * 1000,
    registerSchema: env.REGISTER_SCHEMA !== "off",
    log: env.API_LOG !== "off",
  };
}

/** "portal:abc,accounts:def" -> Map { "abc" => "portal", "def" => "accounts" }. Short keys are refused. */
export function parseServiceKeys(raw: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const pair of (raw ?? "").split(",")) {
    const i = pair.indexOf(":");
    if (i < 1) continue;
    const house = pair.slice(0, i).trim();
    const key = pair.slice(i + 1).trim();
    if (/^[a-z][a-z0-9-]{0,31}$/.test(house) && key.length >= 24) out.set(key, house);
  }
  return out;
}
