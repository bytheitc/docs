// Settings from the environment. Everything this service reads from process.env is read here, once.
//
//   PORT                port to listen on
//   CMS_API_URL         base URL of cms/api (http://localhost:4100 in development)
//   CMS_SPACE_KEY       this house's service key for the CMS. Never leaves the server.
//   API_PUBLIC_URL      this api's address as the CMS sees it, for the content webhook
//   WEB_URL             base URL of this house's web, for cache revalidation
//   REVALIDATE_SECRET   shared with the web; sent as x-revalidate-secret
//   PORTAL_API_URL      the contributor portal's api, for the contributors wall
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
  /** The contributor portal's api (portal/api). Open Source reads its public wall from there. */
  portalApiUrl: string;
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
    portalApiUrl: (env.PORTAL_API_URL || "http://localhost:4006").replace(/\/+$/, ""),
    contentTtlMs: (Number(env.CONTENT_TTL) || 60) * 1000,
    registerSchema: env.REGISTER_SCHEMA !== "off",
    log: env.API_LOG !== "off",
  };
}
