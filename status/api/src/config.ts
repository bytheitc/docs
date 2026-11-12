// Settings from the environment. Everything this service reads from process.env is read here, once.
//
//   PORT              port to listen on (4008)
//   MONGODB_URI       this service's own database. It must NOT be the database of anything it
//                     watches: a status page that dies with its subject is worse than none.
//   STATUS_DB_NAME    database name (itc_status)
//   PUBLIC_URL        this service's own address, used in embed snippets and feeds
//   ROOT_TENANT       tenant served when the Host header matches nothing (useful in development)
//   CHECK_INTERVAL_SECONDS  how often each service is probed (60; 0 switches checking off)
//   PRUNE_DAYS        days of individual probes to keep; day buckets keep the long history (14)
//   SETUP_TOKEN       creates the first tenant, once. Unset in normal running.
//   TRUST_PROXY       "on" when behind a load balancer, so the Host header is read correctly
//   API_LOG           "off" silences request logs
export interface Config {
  production: boolean;
  port: number;
  db: { uri?: string; name: string };
  publicUrl: string;
  rootTenant: string;
  checkIntervalMs: number;
  pruneDays: number;
  setupToken: string;
  trustProxy: boolean;
  log: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === "production";
  const port = Number(env.PORT) || 4008;
  return {
    production,
    port,
    db: { uri: env.MONGODB_URI, name: env.STATUS_DB_NAME || "itc_status" },
    publicUrl: (env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, ""),
    rootTenant: env.ROOT_TENANT || "",
    checkIntervalMs: (env.CHECK_INTERVAL_SECONDS === undefined ? 60 : Number(env.CHECK_INTERVAL_SECONDS) || 0) * 1000,
    pruneDays: Number(env.PRUNE_DAYS) || 14,
    setupToken: env.SETUP_TOKEN || "",
    trustProxy: (env.TRUST_PROXY ?? "").toLowerCase() === "on",
    log: (env.API_LOG ?? "").toLowerCase() !== "off",
  };
}
