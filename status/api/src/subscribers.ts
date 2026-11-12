// Who gets told, and how an unsubscribe link stays valid forever without storing anything usable.
//
// The confirmation token is random, single-use and stored only as a SHA-256 digest, exactly as the
// Collective's newsletter does it: a leaked database must not let anyone confirm an address they do
// not own, which is the whole point of double opt-in.
//
// The unsubscribe token cannot work that way. The newsletter mints one at confirmation, mails it
// once and tells the reader to keep it; a status page sends far more often, and every notification
// has to carry a working link. So it is derived rather than stored: an opaque per-subscriber id
// signed with a server secret. Deterministic, so every email can carry it; unforgeable without the
// secret; and a leaked database yields only ids, which are worthless on their own.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { Subscriber } from "./types.js";

/** `<id>.<signature>` — the id identifies the row, the signature proves we issued it. */
export function unsubscribeToken(id: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(id).digest("base64url");
  return `${id}.${sig}`;
}

/** The id inside a token, or null if the signature does not hold. Never throws on malformed input. */
export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(id).digest("base64url");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

export const newSubscriberId = () => randomUUID();

/* ------------------------------------------------------------------ */
/* What an incident email says                                         */
/* ------------------------------------------------------------------ */

export type NotifyKind = "opened" | "updated" | "resolved";

export interface NotifyInput {
  tenantName: string;
  pageUrl: string;
  manageUrl: string;
  title: string;
  impact: string;
  status: string;
  body: string;
  services: string[];
  kind: NotifyKind;
  scheduled: boolean;
}

const VERB: Record<NotifyKind, string> = {
  opened: "Investigating",
  updated: "Update",
  resolved: "Resolved",
};

/**
 * One message. Plain text only: a status notification is read in a hurry, often on a phone, often
 * by someone already annoyed. The subject carries the whole headline so it reads in a notification
 * without being opened.
 */
export function incidentEmail(n: NotifyInput): { subject: string; text: string } {
  const prefix = n.scheduled ? "Scheduled" : VERB[n.kind];
  const subject = `[${n.tenantName}] ${prefix}: ${n.title}`;

  const text = [
    n.kind === "resolved"
      ? "This incident is resolved."
      : n.kind === "opened"
        ? n.scheduled
          ? "Maintenance has been scheduled."
          : "We're investigating an issue."
        : "There's an update on an ongoing incident.",
    "",
    n.title,
    n.services.length ? `Affects: ${n.services.join(", ")}` : null,
    `Impact: ${n.impact} · Status: ${n.status}`,
    "",
    n.body,
    "",
    `Current status: ${n.pageUrl}`,
    "",
    "—",
    "You're getting this because you asked to be told when this status page changes.",
    `Unsubscribe, with no password and no sign-in: ${n.manageUrl}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return { subject, text };
}

export function confirmEmail(tenantName: string, confirmUrl: string): { subject: string; text: string } {
  return {
    subject: `Confirm your ${tenantName} status updates`,
    text: [
      "Assalāmu ʿalaykum,",
      "",
      `Somebody — we hope you — asked for ${tenantName} status updates at this address.`,
      "",
      `Confirm it here: ${confirmUrl}`,
      "",
      "The link lasts 48 hours. If it wasn't you, ignore this message: nothing else will be sent,",
      "and this address stays off the list.",
    ].join("\n"),
  };
}

export const isConfirmable = (s: Subscriber, now = new Date()): boolean =>
  s.status === "pending" && Boolean(s.confirmExpiresAt) && s.confirmExpiresAt!.getTime() > now.getTime();
