// Request ids, structured logs and error reporting for this api. Copied into every api on purpose,
// like http.ts: no shared package to version, and each copy names its own service below.
//
//   LOG_FORMAT       json | text. Default json in production (one object per line, what a log drain
//                    parses), text in development (what a person reads).
//   ERROR_REPORTING  glitchtip | logs. Where unhandled errors go besides the log. "glitchtip" sends
//                    them to ERROR_DSN using the Sentry envelope protocol, which GlitchTip, Sentry and
//                    the collective's own itc/errors service all accept, so switching between them
//                    is a change of DSN. Default: glitchtip when ERROR_DSN is set, otherwise logs.
//   ERROR_DSN        https://<public key>@<host>/<project id>
//   RELEASE          the release to tag reports with. Default: the Vercel git commit, if any.
//
// Nothing a visitor sent is reported beyond method, path and a short allow-list of headers: no
// body, no query string, no cookies, no authorization. An error report is not a place to keep
// people's data.
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const SERVICE = "errors-api";

/* ------------------------------------------------------------------ */
/* Request context                                                    */
/* ------------------------------------------------------------------ */

interface RequestContext { id: string; method: string; path: string }
const als = new AsyncLocalStorage<RequestContext>();

/** The id of the request being handled, if any. Logs carry it so one request's lines can be found together. */
export const currentRequestId = (): string | undefined => als.getStore()?.id;

const SAFE_ID = /^[A-Za-z0-9._:-]{8,128}$/;

/**
 * Gives every request an id (the caller's X-Request-Id if it looks like one, else Vercel's own, else
 * a new one), echoes it as X-Request-Id, and logs one line when the response finishes.
 */
export function requestContext(opts: { log: boolean }): RequestHandler {
  return (req, res, next) => {
    const given = req.get("x-request-id") ?? req.get("x-vercel-id") ?? "";
    const id = SAFE_ID.test(given) ? given : randomUUID();
    res.setHeader("X-Request-Id", id);
    const ctx: RequestContext = { id, method: req.method, path: req.originalUrl.split("?")[0] };
    const t0 = process.hrtime.bigint();
    if (opts.log) {
      res.on("finish", () => {
        const ms = Math.round((Number(process.hrtime.bigint() - t0) / 1e6) * 10) / 10;
        const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
        log(level, `${ctx.method} ${ctx.path} ${res.statusCode}`, { requestId: id, method: ctx.method, path: ctx.path, status: res.statusCode, ms });
      });
    }
    als.run(ctx, next);
  };
}

/* ------------------------------------------------------------------ */
/* Logs                                                               */
/* ------------------------------------------------------------------ */

type Level = "debug" | "info" | "warn" | "error";
const jsonLogs = (): boolean => (process.env.LOG_FORMAT ?? (process.env.NODE_ENV === "production" ? "json" : "text")) === "json";

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  const requestId = fields.requestId ?? currentRequestId();
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (jsonLogs()) {
    out(JSON.stringify({ time: new Date().toISOString(), level, service: SERVICE, msg, ...(requestId ? { requestId } : {}), ...fields }));
  } else {
    const extra = Object.entries(fields).filter(([k]) => k !== "requestId" && k !== "stack").map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`).join(" ");
    out(`${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${SERVICE}] ${msg}${extra ? ` ${extra}` : ""}${requestId ? ` (${String(requestId).slice(0, 8)})` : ""}${fields.stack ? `\n${fields.stack}` : ""}`);
  }
}

/* ------------------------------------------------------------------ */
/* Error reporting                                                    */
/* ------------------------------------------------------------------ */

interface Dsn { key: string; envelopeUrl: string; raw: string }

function parseDsn(raw: string | undefined): Dsn | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const project = u.pathname.replace(/^\/+|\/+$/g, "").split("/").pop();
    if (!u.username || !project) return null;
    const base = `${u.protocol}//${u.host}${u.pathname.replace(/\/[^/]*\/?$/, "")}`;
    return { key: decodeURIComponent(u.username), envelopeUrl: `${base}/api/${project}/envelope/`, raw };
  } catch {
    return null;
  }
}

let warnedDsn = false;
function reporter(): Dsn | null {
  const mode = (process.env.ERROR_REPORTING ?? (process.env.ERROR_DSN ? "glitchtip" : "logs")).toLowerCase();
  if (mode !== "glitchtip") return null;
  const dsn = parseDsn(process.env.ERROR_DSN);
  if (!dsn && !warnedDsn) {
    warnedDsn = true;
    log("warn", 'ERROR_REPORTING is "glitchtip" but ERROR_DSN is missing or malformed; errors go to the log only.');
  }
  return dsn;
}

interface Frame { function?: string; filename?: string; lineno?: number; colno?: number; in_app?: boolean }
function frames(stack: string | undefined): Frame[] {
  if (!stack) return [];
  const out: Frame[] = [];
  for (const line of stack.split("\n").slice(1)) {
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);
    if (!m) continue;
    const filename = m[2].replace(/^file:\/\//, "");
    out.push({ function: m[1] || "<anonymous>", filename, lineno: Number(m[3]), colno: Number(m[4]), in_app: !/node_modules|node:internal|^node:/.test(filename) });
  }
  return out.reverse(); // the protocol lists frames oldest first
}

const HEADER_ALLOW = ["user-agent", "referer", "content-type", "accept", "x-vercel-id"];

/**
 * Logs an error and, when reporting is on, sends it to ERROR_DSN. Resolves when the report has been
 * sent or has given up (1.5 s), so a caller on a serverless host can await it before responding.
 * Never throws: a broken error reporter must not turn one failure into two.
 */
export async function reportError(err: unknown, extra: { request?: { method: string; path: string; headers?: Record<string, string | string[] | undefined> }; tags?: Record<string, string> } = {}): Promise<void> {
  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : JSON.stringify(err));
  const ctx = als.getStore();
  const request = extra.request ?? (ctx ? { method: ctx.method, path: ctx.path } : undefined);
  log("error", e.message, { stack: e.stack, error: e.name, ...(request ? { method: request.method, path: request.path } : {}) });

  const dsn = reporter();
  if (!dsn) return;
  const eventId = randomUUID().replace(/-/g, "");
  const headers = Object.fromEntries(HEADER_ALLOW.map((h) => [h, request?.headers?.[h]]).filter(([, v]) => typeof v === "string"));
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    logger: SERVICE,
    server_name: SERVICE,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA,
    tags: { service: SERVICE, ...(ctx?.id ? { request_id: ctx.id } : {}), ...extra.tags },
    exception: { values: [{ type: e.name, value: e.message, stacktrace: { frames: frames(e.stack) } }] },
    ...(request ? { request: { method: request.method, url: request.path, headers } } : {}),
  };
  const body = `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), dsn: dsn.raw })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}\n`;
  try {
    const res = await fetch(dsn.envelopeUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-sentry-envelope",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=itc-observe/1.0`,
      },
      body,
      signal: AbortSignal.timeout(1_500),
    });
    if (!res.ok) log("warn", `error report rejected: HTTP ${res.status}`);
  } catch (re) {
    log("warn", `error report not sent: ${(re as Error).message}`);
  }
}

let processHooked = false;
/** Reports crashes that never reach a request handler. Call once from the composition root. */
export function reportProcessErrors(): void {
  if (processHooked) return;
  processHooked = true;
  process.on("unhandledRejection", (reason) => void reportError(reason, { tags: { mechanism: "unhandledRejection" } }));
  process.on("uncaughtExceptionMonitor", (err) => void reportError(err, { tags: { mechanism: "uncaughtException" } }));
}
