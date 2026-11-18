// The ingest endpoints, at the paths every Sentry-protocol SDK posts to:
//
//   POST /api/:projectId/envelope/   the current protocol (newline-delimited items)
//   POST /api/:projectId/store/      the older one (a single JSON event)
//
// Authenticated by the project's public key (X-Sentry-Auth, ?sentry_key=, or the DSN inside the
// envelope). The key is public by design: it allows sending events to one project and nothing else.
// Bodies may be gzip/deflate/br compressed. CORS is open so a browser SDK can report too.
import { timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import zlib from "node:zlib";
import express, { Router, type Request, type RequestHandler, type Response } from "express";
import { maybeAlert } from "../alerts.js";
import type { Ctx } from "../app.js";
import { normalize, parseEnvelope, ProtocolError, publicKeyOf } from "../event.js";
import { rateLimit } from "../http.js";
import { log } from "../observe.js";
import { getStore } from "../store/index.js";

const MAX_BODY = "1mb";
const MAX_DECOMPRESSED = 5 * 1024 * 1024;
const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);

const cors: RequestHandler = (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-sentry-auth, sentry-trace, baggage, content-encoding");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return void res.status(204).end();
  next();
};

// express.raw already inflates gzip/deflate/br per Content-Encoding. What still arrives compressed
// (an SDK that compresses without saying so) is recognised by its magic bytes.
async function decode(req: Request): Promise<Buffer> {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const opts = { maxOutputLength: MAX_DECOMPRESSED };
  if (raw[0] === 0x1f && raw[1] === 0x8b) return gunzip(raw, opts);
  if (raw[0] === 0x78 && [0x01, 0x5e, 0x9c, 0xda].includes(raw[1])) return inflate(raw, opts);
  return raw;
}

const keyMatches = (given: string | undefined, want: string): boolean => {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
};

const reject = (res: Response, status: number, detail: string) => res.status(status).json({ detail });

export function ingestRoutes(ctx: Ctx): Router {
  const r = Router();
  const raw = express.raw({ type: () => true, limit: MAX_BODY });
  const perProject = rateLimit({ max: ctx.config.projectRatePerMin, windowMs: 60_000, name: "ingest", key: (req) => String(req.params.projectId) });

  const handle = (kind: "envelope" | "store"): RequestHandler => async (req, res) => {
    const store = getStore();
    if (!store) return reject(res, 503, "error tracking has no database");

    let body: Buffer;
    try {
      body = await decode(req);
    } catch {
      return reject(res, 400, "could not decompress the body");
    }

    let header: Record<string, unknown> = {};
    let payloads: Record<string, unknown>[];
    try {
      if (kind === "envelope") ({ header, events: payloads } = parseEnvelope(body));
      else {
        const one = JSON.parse(body.toString("utf8"));
        if (!one || typeof one !== "object" || Array.isArray(one)) throw new ProtocolError("event is not a JSON object");
        payloads = [one];
      }
    } catch (e) {
      return reject(res, 400, e instanceof ProtocolError ? e.message : "body is not valid JSON");
    }

    const project = await store.getProject(String(req.params.projectId));
    const key = publicKeyOf(req.get("x-sentry-auth"), req.query as Record<string, unknown>, header);
    if (!project || !keyMatches(key, project.publicKey)) return reject(res, 401, "unknown project or key");

    // Nothing to record (a session update, a client report): acknowledged, as the protocol expects.
    if (!payloads.length) return res.json({ id: typeof header.event_id === "string" ? header.event_id : null });

    let lastId: string | null = null;
    for (const p of payloads) {
      const { event, fingerprint } = normalize(p);
      const { issue, outcome } = await store.ingest(project.id, fingerprint, event, { keepPerIssue: ctx.config.eventsPerIssue, retentionDays: ctx.config.retentionDays });
      lastId = event.id;
      if (outcome === "new" || outcome === "regression") log("info", `${outcome} issue in ${project.slug}: ${issue.title}`, { issueId: issue.id });
      // Awaited, not fired off: on a serverless host work left running after the response is frozen.
      await maybeAlert(ctx.config, store, project, issue, outcome);
    }
    res.json({ id: lastId });
  };

  // "{/}" accepts the path with or without its trailing slash; SDKs differ.
  r.options("/api/:projectId/:kind{/}", cors);
  r.post("/api/:projectId/envelope{/}", cors, perProject, raw, handle("envelope"));
  r.post("/api/:projectId/store{/}", cors, perProject, raw, handle("store"));
  return r;
}
