// Configuration, read once from the environment.
//
//   PORT                 4012
//   PUBLIC_URL           this service's public address: the tracker script and the snippet point here
//   MONGODB_URI          its own database
//   ANALYTICS_DB_NAME    itc_analytics
//   CMS_API_URL          staff sign in with their CMS accounts (space "analytics"); no second password
//   CMS_SPACE_KEY        this service's key in the CMS
//   RETENTION_DAYS       how long individual page views are kept (400, so a year can be compared)
//   COLLECT_RATE_PER_MIN events accepted per visitor address per minute (120); the rest get 429
//   API_LOG              "off" silences request logs
//
// ERROR_REPORTING / ERROR_DSN work as in every other api (observe.ts).
export interface Config {
  production: boolean;
  port: number;
  publicUrl: string;
  db: { uri?: string; name: string };
  cms: { url: string; key: string; space: string };
  retentionDays: number;
  collectRatePerMin: number;
  log: boolean;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const port = Number(env.PORT) || 4012;
  return {
    production: env.NODE_ENV === "production",
    port,
    publicUrl: (env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, ""),
    db: { uri: env.MONGODB_URI || undefined, name: env.ANALYTICS_DB_NAME || "itc_analytics" },
    cms: { url: (env.CMS_API_URL || "http://localhost:4100").replace(/\/+$/, ""), key: env.CMS_SPACE_KEY || (env.NODE_ENV === "production" ? "" : "dev-analytics-key"), space: "analytics" },
    retentionDays: Number(env.RETENTION_DAYS) || 400,
    collectRatePerMin: Number(env.COLLECT_RATE_PER_MIN) || 120,
    log: (env.API_LOG ?? "").toLowerCase() !== "off",
  };
}
