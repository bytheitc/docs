// Settings from the environment. Everything the service reads from process.env is read here, once.
//
//   PORT              port to listen on (4100)
//   CMS_DB            which database to use: "mongodb" (default). Others plug in via storage.ts.
//   MONGODB_URI       connection string for MongoDB (e.g. an Atlas cluster)
//   CMS_DB_NAME       database name (itc_cms)
//   CMS_SPACE_KEYS    "site:<key>,ai:<key>,…"  service keys, one per space
//   CMS_SETUP_TOKEN   required to create the first admin in production
//   CMS_TRUST_PROXY   set to "1" (or a hop count) when behind a reverse proxy, so rate limits see client IPs
//   CMS_LOGIN_LIMIT   sign-in/setup attempts allowed per 10 minutes per client and email (20)
//   CMS_LOG           "off" silences request logs
import { SPACE_PATTERN } from "./validate.js";

export interface Config {
  production: boolean;
  port: number;
  db: { kind: string; uri?: string; name: string };
  /** space id → key */
  spaceKeys: Map<string, string>;
  setupToken?: string;
  trustProxy: boolean | number;
  loginLimit: { max: number; windowMs: number };
  log: boolean;
}

export function parseSpaceKeys(raw: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of (raw ?? "").split(",")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    const space = part.slice(0, i).trim(), key = part.slice(i + 1).trim();
    if (!SPACE_PATTERN.test(space) || !key) continue;
    if (key.length < 16) console.warn(`[cms] CMS_SPACE_KEYS: the key for "${space}" is shorter than 16 characters; use a long random key.`);
    out.set(space, key);
  }
  return out;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const tp = env.CMS_TRUST_PROXY;
  return {
    production: env.NODE_ENV === "production",
    port: Number(env.PORT) || 4100,
    db: { kind: (env.CMS_DB ?? "mongodb").toLowerCase(), uri: env.MONGODB_URI, name: env.CMS_DB_NAME || "itc_cms" },
    spaceKeys: parseSpaceKeys(env.CMS_SPACE_KEYS),
    setupToken: env.CMS_SETUP_TOKEN || undefined,
    trustProxy: !tp ? false : /^\d+$/.test(tp) ? Number(tp) : tp === "true" || tp === "1",
    loginLimit: { max: Number(env.CMS_LOGIN_LIMIT) || 20, windowMs: 10 * 60_000 },
    log: env.CMS_LOG !== "off",
  };
}
