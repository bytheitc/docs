// Small HTTP helpers: the error shape, body readers, a rate limiter and the request log.
// The same shape as cms/api, so every ITC service answers errors the same way.
// Kept deliberately identical in every house api.
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import { reportError, requestContext } from "./observe.js";

export type ErrorCode =
  | "bad_request" | "validation_failed" | "unauthorized" | "forbidden" | "not_found"
  | "payload_too_large" | "rate_limited" | "unavailable" | "internal";

/** Thrown anywhere in a handler; the error middleware turns it into `{ error: { code, message, fields } }`. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) => new HttpError(400, "bad_request", message, fields);
export const invalid = (fields: Record<string, string>, message = "Please fix the highlighted fields.") => new HttpError(400, "validation_failed", message, fields);
export const unauthorized = (message = "Not allowed.") => new HttpError(401, "unauthorized", message);
export const notFound = (message = "Not found.") => new HttpError(404, "not_found", message);
export const unavailable = (message: string) => new HttpError(503, "unavailable", message);

export function sendError(res: Response, status: number, code: ErrorCode, message: string, fields?: Record<string, string>) {
  res.status(status).json({ error: { code, message, ...(fields && Object.keys(fields).length ? { fields } : {}) } });
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  void _next;
  if (err instanceof HttpError) return sendError(res, err.status, err.code, err.message, err.fields);
  const e = err as { type?: string; status?: number };
  if (e?.type === "entity.too.large") return sendError(res, 413, "payload_too_large", "The request body is too large.");
  if (e?.type === "entity.parse.failed") return sendError(res, 400, "bad_request", "The request body is not valid JSON.");
  if (e?.status && e.status >= 400 && e.status < 500) return sendError(res, e.status, "bad_request", "The request could not be read.");
  // Reported (observe.ts) before the response goes out: on a serverless host anything still running
  // after the response may be frozen. The request id lets someone quote this failure back to us.
  void reportError(err, { request: { method: req.method, path: req.originalUrl.split("?")[0], headers: req.headers } }).finally(() => {
    const ref = res.getHeader("X-Request-Id");
    sendError(res, 500, "internal", `Something went wrong on our side.${ref ? ` Reference: ${String(ref)}` : ""}`);
  });
};

export const notFoundHandler: RequestHandler = (_req, res) => sendError(res, 404, "not_found", "No such endpoint.");

/* ------------------------------------------------------------------ */
/* Body readers                                                       */
/* ------------------------------------------------------------------ */

export type Body = Record<string, unknown>;

/** The JSON body as an object (never an array or primitive). */
export function body(req: Request): Body {
  const b = req.body as unknown;
  if (b == null) return {};
  if (typeof b !== "object" || Array.isArray(b)) throw badRequest("The request body must be a JSON object.");
  return b as Body;
}

/** A string field, trimmed and length-capped. */
export function str(b: Body, key: string, opts: { required?: boolean; max?: number } = {}): string {
  const v = b[key];
  if (v != null && typeof v !== "string") throw badRequest(`"${key}" must be a string.`, { [key]: "Must be a string." });
  const s = ((v as string | undefined) ?? "").trim();
  if (opts.max && s.length > opts.max) throw badRequest(`"${key}" is too long (max ${opts.max}).`, { [key]: `At most ${opts.max} characters.` });
  if (opts.required && !s) throw badRequest(`"${key}" is required.`, { [key]: "Required." });
  return s;
}

/* ------------------------------------------------------------------ */
/* Rate limiting                                                      */
/* ------------------------------------------------------------------ */
//
// Fixed windows, counted in MongoDB when MONGODB_URI is set and in this process's memory when it
// isn't. Memory alone is no limit on a serverless host or behind several instances: each process
// sees only the requests it happened to receive. The shared counter lives in one database for
// every service (RATE_LIMIT_DB_NAME, default itc_ratelimit), keyed by limiter name, and expires
// itself through a TTL index.
//
// If the database is unreachable the limiter falls back to memory for that request rather than
// refusing it: a rate limit that locks out real visitors when Mongo hiccups is worse than a
// briefly weaker one.
//
// Keys usually include req.ip, which is only the client's address when Express trusts the proxy
// in front of it. See trustProxySetting() below.

type Counter = (key: string, windowMs: number) => Promise<{ count: number; resetAt: number }>;

/** One per limiter, as before: separate app instances in one process (the tests) don't share counts. */
function memoryCounter(): Counter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  let sweep: NodeJS.Timeout | undefined;
  return async (key, windowMs) => {
    if (!sweep) {
      // Forget expired windows now and then so the map can't grow without bound.
      sweep = setInterval(() => {
        const now = Date.now();
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }, 60_000);
      sweep.unref();
    }
    const now = Date.now();
    const cur = hits.get(key);
    if (!cur || cur.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      hits.set(key, fresh);
      return fresh;
    }
    cur.count++;
    return cur;
  };
}

interface RateDoc { _id: string; n: number; expireAt: Date }
let mongoCounter: Promise<Counter | null> | undefined;
// After a database error the shared counter is skipped for a while, so an outage costs one slow
// request every 30 seconds instead of a connection timeout on every request.
let sharedDownUntil = 0;
function sharedCounter(): Promise<Counter | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri || Date.now() < sharedDownUntil) return Promise.resolve(null);
  mongoCounter ??= (async () => {
    try {
      // Imported lazily so a package without the driver (or without a database) still works.
      const { MongoClient } = await import("mongodb");
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2_000, maxPoolSize: 5 });
      const col = client.db(process.env.RATE_LIMIT_DB_NAME || "itc_ratelimit").collection<RateDoc>("windows");
      await col.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});
      return async (key, windowMs) => {
        const start = Math.floor(Date.now() / windowMs) * windowMs;
        const resetAt = start + windowMs;
        const doc = await col.findOneAndUpdate(
          { _id: `${key}|${start}` },
          { $inc: { n: 1 }, $setOnInsert: { expireAt: new Date(resetAt) } },
          { upsert: true, returnDocument: "after" },
        );
        return { count: doc?.n ?? 1, resetAt };
      };
    } catch (e) {
      console.error(`[api] shared rate limit unavailable, using memory: ${(e as Error).message}`);
      mongoCounter = undefined; // try again on a later request
      return null;
    }
  })();
  return mongoCounter;
}

export function rateLimit(opts: { max: number; windowMs: number; key: (req: Request) => string; name: string }): RequestHandler {
  const memory = memoryCounter();
  return (req: Request, res: Response, next: NextFunction) => {
    const k = `${opts.name}|${opts.key(req)}`;
    void (async () => {
      let hit: { count: number; resetAt: number };
      try {
        const shared = await sharedCounter();
        hit = shared ? await shared(k, opts.windowMs) : await memory(k, opts.windowMs);
      } catch (e) {
        sharedDownUntil = Date.now() + 30_000;
        console.error(`[api] rate limit "${opts.name}" fell back to memory for 30 s: ${(e as Error).message}`);
        hit = await memory(k, opts.windowMs);
      }
      if (hit.count > opts.max) {
        const retry = Math.max(1, Math.ceil((hit.resetAt - Date.now()) / 1000));
        res.setHeader("Retry-After", String(retry));
        return sendError(res, 429, "rate_limited", `Too many attempts. Try again in ${Math.ceil(retry / 60)} minute(s).`);
      }
      next();
    })().catch(next);
  };
}

/**
 * The value for app.set("trust proxy"). Without it req.ip is the address of whatever proxy is in
 * front of this api, so every visitor shares one rate-limit bucket. TRUST_PROXY takes "on"/"true",
 * "off"/"false", or a hop count; unset, it is on under Vercel (which overwrites X-Forwarded-For
 * with the real client address, so it can't be spoofed) and off elsewhere.
 */
export function trustProxySetting(env: Record<string, string | undefined> = process.env): boolean | number {
  const v = (env.TRUST_PROXY ?? "").trim().toLowerCase();
  if (v === "on" || v === "true") return true;
  if (v === "off" || v === "false") return false;
  if (/^\d+$/.test(v)) return Number(v);
  return env.VERCEL === "1";
}

/* ------------------------------------------------------------------ */
/* Request log: method, path, status, duration. Never bodies, queries or headers. */
/* ------------------------------------------------------------------ */

/** Request id + one structured log line per request (observe.ts). Kept under this name for the call sites. */
export function requestLog(enabled: boolean): RequestHandler {
  return requestContext({ log: enabled });
}
