// Configuration, read once from the environment.
//
//   PORT                   4011
//   PUBLIC_URL             this service's public address, used in the DSNs it hands out
//   MONGODB_URI            its own database. Give it a separate cluster from what it watches if you
//                          can: an error tracker that fails with everything else explains nothing
//   ERRORS_DB_NAME         itc_errors
//   CMS_API_URL            staff sign in with their CMS accounts (space "errors"); no second password
//   CMS_SPACE_KEY          this service's key in the CMS
//   RETENTION_DAYS         how long individual events are kept (30). Issues and their counts stay
//   EVENTS_PER_ISSUE       newest events kept per issue (100); older ones are dropped on ingest
//   PROJECT_RATE_PER_MIN   events accepted per project per minute (600); the rest get 429
//   ALERT_WEBHOOK_URL      POSTed on a new issue or a regression. Slack and Discord both accept the body
//   ALERT_EMAIL_TO         also email those alerts (comma-separated), through the email house:
//   EMAIL_API_URL          email/api's address
//   EMAIL_SERVICE_KEY      this service's key in email/api's EMAIL_SERVICE_KEYS
//   ALERT_COOLDOWN_MINUTES at most one alert per issue in this window (60)
//   API_LOG                "off" silences request logs
//
// ERROR_REPORTING for this service itself defaults to "logs": pointing an error tracker's own
// failures at itself turns one fault into a loop.
export interface Config {
  production: boolean;
  port: number;
  publicUrl: string;
  db: { uri?: string; name: string };
  cms: { url: string; key: string; space: string };
  retentionDays: number;
  eventsPerIssue: number;
  projectRatePerMin: number;
  alerts: { webhookUrl?: string; emailTo: string[]; emailApiUrl?: string; emailServiceKey?: string; cooldownMs: number };
  log: boolean;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const port = Number(env.PORT) || 4011;
  return {
    production: env.NODE_ENV === "production",
    port,
    publicUrl: (env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, ""),
    db: { uri: env.MONGODB_URI || undefined, name: env.ERRORS_DB_NAME || "itc_errors" },
    cms: { url: (env.CMS_API_URL || "http://localhost:4100").replace(/\/+$/, ""), key: env.CMS_SPACE_KEY || (env.NODE_ENV === "production" ? "" : "dev-errors-key"), space: "errors" },
    retentionDays: Number(env.RETENTION_DAYS) || 30,
    eventsPerIssue: Number(env.EVENTS_PER_ISSUE) || 100,
    projectRatePerMin: Number(env.PROJECT_RATE_PER_MIN) || 600,
    alerts: {
      webhookUrl: env.ALERT_WEBHOOK_URL || undefined,
      emailTo: (env.ALERT_EMAIL_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      emailApiUrl: env.EMAIL_API_URL ? env.EMAIL_API_URL.replace(/\/+$/, "") : undefined,
      emailServiceKey: env.EMAIL_SERVICE_KEY || undefined,
      cooldownMs: (Number(env.ALERT_COOLDOWN_MINUTES) || 60) * 60_000,
    },
    log: (env.API_LOG ?? "").toLowerCase() !== "off",
  };
}
