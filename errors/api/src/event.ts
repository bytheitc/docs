// The wire protocol (Sentry's envelope and store formats, which GlitchTip also speaks) and the one
// shape this service keeps an event in.
//
// An envelope is newline-delimited: a header line, then items, each an item-header line followed by
// a payload. A payload's length is either given in its item header or runs to the next newline.
// Only "event" items become issues; sessions, client reports, transactions and attachments are
// acknowledged and dropped, which is what a tracker that only does errors should do.
import { createHash } from "node:crypto";

export interface Frame { function?: string; module?: string; filename?: string; abs_path?: string; lineno?: number; colno?: number; in_app?: boolean; context_line?: string }
export interface ExceptionValue { type?: string; value?: string; module?: string; stacktrace?: { frames?: Frame[] } }

/** What is stored for each event: everything the issue page shows, nothing the SDK sent beyond that. */
export interface StoredEvent {
  id: string;
  receivedAt: Date;
  timestamp: Date;
  level: string;
  platform: string;
  title: string;
  culprit: string;
  message?: string;
  exceptions: ExceptionValue[];
  environment?: string;
  release?: string;
  serverName?: string;
  tags: Record<string, string>;
  request?: { method?: string; url?: string; headers?: Record<string, string> };
  sdk?: string;
}

export interface Normalized { event: StoredEvent; fingerprint: string }

const LEVELS = new Set(["fatal", "error", "warning", "info", "debug"]);
const cap = (s: unknown, n: number): string | undefined => (typeof s === "string" ? s.slice(0, n) : undefined);
const HEX32 = /^[0-9a-f]{32}$/;

export class ProtocolError extends Error {}

/** Splits an envelope into its event payloads. Throws ProtocolError when it isn't one. */
export function parseEnvelope(raw: Buffer): { header: Record<string, unknown>; events: Record<string, unknown>[] } {
  let pos = 0;
  const readLine = (): Buffer | null => {
    if (pos >= raw.length) return null;
    const nl = raw.indexOf(0x0a, pos);
    const end = nl === -1 ? raw.length : nl;
    const line = raw.subarray(pos, end);
    pos = end + 1;
    return line;
  };
  const json = (b: Buffer | null, what: string): Record<string, unknown> => {
    if (!b || !b.length) throw new ProtocolError(`missing ${what}`);
    try {
      const v = JSON.parse(b.toString("utf8"));
      if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("not an object");
      return v as Record<string, unknown>;
    } catch {
      throw new ProtocolError(`${what} is not a JSON object`);
    }
  };

  const header = json(readLine(), "envelope header");
  const events: Record<string, unknown>[] = [];
  for (;;) {
    const ih = readLine();
    if (ih === null) break;
    if (!ih.length) continue; // trailing newline
    const itemHeader = json(ih, "item header");
    let payload: Buffer;
    if (typeof itemHeader.length === "number" && itemHeader.length >= 0) {
      payload = raw.subarray(pos, pos + itemHeader.length);
      pos += itemHeader.length + 1; // the payload, then its newline
    } else {
      payload = readLine() ?? Buffer.alloc(0);
    }
    if (itemHeader.type === "event") events.push(json(payload, "event payload"));
  }
  return { header, events };
}

function frameKey(f: Frame): string {
  // Line numbers move with every edit; the function and where it lives don't.
  return `${f.module ?? (f.filename ?? f.abs_path ?? "").replace(/\?.*$/, "")}:${f.function ?? "?"}`;
}

/** Strips what varies between occurrences of the same message: numbers, ids, hex, quoted values. */
function messageShape(m: string): string {
  return m
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\b[0-9a-f]{16,}\b/gi, "<hex>")
    .replace(/(["'`]).*?\1/g, "<str>")
    .replace(/\d+(\.\d+)?/g, "<n>");
}

const sha = (parts: string[]) => createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 40);

/** Turns a protocol event into the stored shape, and decides which issue it belongs to. */
export function normalize(ev: Record<string, unknown>, now = new Date()): Normalized {
  const rawId = typeof ev.event_id === "string" ? ev.event_id.replace(/-/g, "").toLowerCase() : "";
  const id = HEX32.test(rawId) ? rawId : createHash("sha256").update(`${now.getTime()}${Math.random()}`).digest("hex").slice(0, 32);

  const exRaw = (ev.exception as { values?: unknown[] } | undefined)?.values ?? (Array.isArray(ev.exception) ? ev.exception : []);
  const exceptions: ExceptionValue[] = (Array.isArray(exRaw) ? exRaw : []).slice(-5).map((x) => {
    const e = (x ?? {}) as Record<string, unknown>;
    const st = e.stacktrace as { frames?: unknown[] } | undefined;
    const frames = (Array.isArray(st?.frames) ? st!.frames : []).slice(-60).map((fr) => {
      const f = (fr ?? {}) as Record<string, unknown>;
      return {
        function: cap(f.function, 200), module: cap(f.module, 200), filename: cap(f.filename, 300), abs_path: cap(f.abs_path, 300),
        lineno: typeof f.lineno === "number" ? f.lineno : undefined, colno: typeof f.colno === "number" ? f.colno : undefined,
        in_app: typeof f.in_app === "boolean" ? f.in_app : undefined, context_line: cap(f.context_line, 300),
      } satisfies Frame;
    });
    return { type: cap(e.type, 200), value: cap(e.value, 2000), module: cap(e.module, 200), stacktrace: { frames } };
  });

  const logentry = ev.logentry as { formatted?: string; message?: string } | undefined;
  const message = cap(typeof ev.message === "string" ? ev.message : (ev.message as { formatted?: string } | undefined)?.formatted ?? logentry?.formatted ?? logentry?.message, 2000);

  const primary = exceptions[exceptions.length - 1];
  const frames = primary?.stacktrace?.frames ?? [];
  const appFrames = frames.filter((f) => f.in_app !== false);
  const top = (appFrames.length ? appFrames : frames).at(-1);

  const title = primary ? `${primary.type ?? "Error"}${primary.value ? `: ${primary.value.split("\n")[0]}` : ""}`.slice(0, 300) : (message ?? "(no message)").split("\n")[0].slice(0, 300);
  const culprit = cap(ev.culprit, 300) ?? cap(ev.transaction, 300) ?? (top ? `${top.function ?? "?"} (${top.module ?? top.filename ?? "?"})` : "");

  // An SDK may name the grouping itself; "{{ default }}" stands for ours.
  let defaultParts: string[];
  if (primary && frames.length) defaultParts = ["stack", primary.type ?? "", ...(appFrames.length ? appFrames : frames).slice(-5).map(frameKey)];
  else if (primary) defaultParts = ["type", primary.type ?? "", messageShape(primary.value ?? "")];
  else defaultParts = ["message", messageShape(message ?? "")];
  const given = Array.isArray(ev.fingerprint) ? ev.fingerprint.filter((x): x is string => typeof x === "string").slice(0, 10) : [];
  const fingerprint = sha(given.length ? given.flatMap((p) => (p === "{{ default }}" ? defaultParts : [p])) : defaultParts);

  const rawTags = ev.tags;
  const tags: Record<string, string> = {};
  const tagPairs = Array.isArray(rawTags) ? rawTags : rawTags && typeof rawTags === "object" ? Object.entries(rawTags) : [];
  for (const pair of tagPairs.slice(0, 50)) {
    const [k, v] = pair as [unknown, unknown];
    if (typeof k === "string" && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) tags[k.slice(0, 64)] = String(v).slice(0, 200);
  }

  const req = ev.request as { method?: unknown; url?: unknown; headers?: unknown } | undefined;
  const headers: Record<string, string> = {};
  // Never keep credentials, even if an SDK sends them.
  const DROP = /^(authorization|cookie|set-cookie|x-api-key|x-service-key|proxy-authorization)$/i;
  const hp = Array.isArray(req?.headers) ? req!.headers : req?.headers && typeof req.headers === "object" ? Object.entries(req.headers) : [];
  for (const pair of (hp as unknown[]).slice(0, 30)) {
    const [k, v] = pair as [unknown, unknown];
    if (typeof k === "string" && typeof v === "string" && !DROP.test(k)) headers[k.toLowerCase().slice(0, 64)] = v.slice(0, 300);
  }

  const ts = typeof ev.timestamp === "number" ? new Date(ev.timestamp * 1000) : typeof ev.timestamp === "string" ? new Date(ev.timestamp) : now;
  const sdk = ev.sdk as { name?: string; version?: string } | undefined;

  return {
    fingerprint,
    event: {
      id,
      receivedAt: now,
      timestamp: Number.isNaN(ts.getTime()) ? now : ts,
      level: typeof ev.level === "string" && LEVELS.has(ev.level) ? ev.level : "error",
      platform: cap(ev.platform, 32) ?? "other",
      title,
      culprit,
      message,
      exceptions,
      environment: cap(ev.environment, 64),
      release: cap(ev.release, 200),
      serverName: cap(ev.server_name, 200),
      tags,
      request: req ? { method: cap(req.method, 16), url: cap(typeof req.url === "string" ? req.url.split("?")[0] : undefined, 500), headers } : undefined,
      sdk: sdk?.name ? `${sdk.name}${sdk.version ? `/${sdk.version}` : ""}`.slice(0, 100) : undefined,
    },
  };
}

/**
 * The public key a request authenticates with: the X-Sentry-Auth header, the sentry_key query
 * parameter (browsers), or the DSN in an envelope's own header.
 */
export function publicKeyOf(headerValue: string | undefined, query: Record<string, unknown>, envelopeHeader?: Record<string, unknown>): string | undefined {
  const fromHeader = headerValue?.match(/sentry_key=([^,\s]+)/)?.[1];
  if (fromHeader) return fromHeader;
  if (typeof query.sentry_key === "string") return query.sentry_key;
  if (typeof envelopeHeader?.dsn === "string") {
    try { return decodeURIComponent(new URL(envelopeHeader.dsn).username) || undefined; } catch { return undefined; }
  }
  return undefined;
}
