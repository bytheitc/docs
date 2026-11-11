// Small HTTP helpers: the error shape, body readers, a rate limiter and the request log.
// Written by hand to keep the dependency list to express + mongodb.
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";

export type ErrorCode =
  | "bad_request" | "validation_failed" | "unauthorized" | "forbidden" | "not_found" | "conflict"
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
export const unauthorized = (message = "Sign in first.") => new HttpError(401, "unauthorized", message);
export const forbidden = (message = "You don't have access to that.") => new HttpError(403, "forbidden", message);
export const notFound = (message = "Not found.") => new HttpError(404, "not_found", message);
export const conflict = (message: string, fields?: Record<string, string>) => new HttpError(409, "conflict", message, fields);

export function sendError(res: Response, status: number, code: ErrorCode, message: string, fields?: Record<string, string>) {
  res.status(status).json({ error: { code, message, ...(fields && Object.keys(fields).length ? { fields } : {}) } });
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  void _next;
  if (err instanceof HttpError) return sendError(res, err.status, err.code, err.message, err.fields);
  // body-parser errors
  const e = err as { type?: string; status?: number };
  if (e?.type === "entity.too.large") return sendError(res, 413, "payload_too_large", "The request body is too large.");
  if (e?.type === "entity.parse.failed") return sendError(res, 400, "bad_request", "The request body is not valid JSON.");
  if (e?.type === "encoding.unsupported" || e?.type === "charset.unsupported") return sendError(res, 415 as number, "bad_request", "Unsupported body encoding.");
  if (e?.status && e.status >= 400 && e.status < 500) return sendError(res, e.status, "bad_request", "The request could not be read.");
  console.error("[cms] unhandled error:", err instanceof Error ? err.stack ?? err.message : err);
  sendError(res, 500, "internal", "Something went wrong on our side.");
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

/** A string field, trimmed and length-capped. `required` turns a missing value into a 400. */
export function str(b: Body, key: string, opts: { required?: boolean; max?: number; trim?: boolean } = {}): string {
  const v = b[key];
  if (v != null && typeof v !== "string") throw badRequest(`"${key}" must be a string.`, { [key]: "Must be a string." });
  let s = (v as string | undefined) ?? "";
  if (opts.trim !== false) s = s.trim();
  if (opts.max && s.length > opts.max) throw badRequest(`"${key}" is too long (max ${opts.max}).`, { [key]: `At most ${opts.max} characters.` });
  if (opts.required && !s) throw badRequest(`"${key}" is required.`, { [key]: "Required." });
  return s;
}

export function oneOf<T extends string>(b: Body, key: string, allowed: readonly T[], fallback?: T): T {
  const v = b[key] ?? fallback;
  if (typeof v !== "string" || !allowed.includes(v as T)) {
    throw badRequest(`"${key}" must be one of: ${allowed.join(", ")}.`, { [key]: `Must be one of: ${allowed.join(", ")}.` });
  }
  return v as T;
}

/* ------------------------------------------------------------------ */
/* Rate limiting (in memory, per process)                             */
/* ------------------------------------------------------------------ */

export function rateLimit(opts: { max: number; windowMs: number; key: (req: Request) => string; name: string }): RequestHandler {
  const hits = new Map<string, number[]>();
  // Forget idle keys now and then so the map can't grow without bound.
  const sweep = setInterval(() => {
    const cutoff = Date.now() - opts.windowMs;
    for (const [k, times] of hits) if (!times.length || times[times.length - 1] < cutoff) hits.delete(k);
  }, opts.windowMs);
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const k = `${opts.name}|${opts.key(req)}`;
    const now = Date.now();
    const times = (hits.get(k) ?? []).filter((t) => t > now - opts.windowMs);
    if (times.length >= opts.max) {
      const retry = Math.ceil((times[0] + opts.windowMs - now) / 1000);
      res.setHeader("Retry-After", String(retry));
      return sendError(res, 429, "rate_limited", `Too many attempts. Try again in ${Math.ceil(retry / 60)} minute(s).`);
    }
    times.push(now);
    hits.set(k, times);
    next();
  };
}

/* ------------------------------------------------------------------ */
/* Request log: method, path, status, duration. Never bodies, queries or headers. */
/* ------------------------------------------------------------------ */

export function requestLog(enabled: boolean): RequestHandler {
  return (req, res, next) => {
    if (!enabled) return next();
    const t0 = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      const path = req.originalUrl.split("?")[0];
      console.log(`${new Date().toISOString()} ${req.method} ${path} ${res.statusCode} ${ms.toFixed(1)}ms`);
    });
    next();
  };
}
