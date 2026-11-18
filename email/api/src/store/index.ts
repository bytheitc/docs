// Picks the EmailStore implementation from this api's configuration. This service's data lives in
// its own database (itc_email) and only this api ever touches it (ARCHITECTURE.md, rule 2).
//
// The store is a singleton, set once at boot by initEmailStore(). With no database configured
// every email endpoint answers 503.
import type { Config } from "../config.js";
import { createEmailMongoStore } from "./mongo.js";
import type { EmailStore } from "./types.js";

export const SUPPORTED_DATABASES = ["mongodb"] as const;

export interface StorageStatus {
  configured: boolean;
  kind: string;
  problem?: string;
}

export function storageStatus(config: Config): StorageStatus {
  const kind = config.db.kind;
  if (!(SUPPORTED_DATABASES as readonly string[]).includes(kind)) {
    return { configured: false, kind, problem: `EMAIL_DB="${kind}" is not supported yet. Supported: ${SUPPORTED_DATABASES.join(", ")}.` };
  }
  if (kind === "mongodb" && !config.db.uri) {
    return { configured: false, kind, problem: "MONGODB_URI is not set. Add it to .env.local and restart the api." };
  }
  return { configured: true, kind };
}

let store: EmailStore | null = null;
let problem: string | null = null;

/** Called once at boot. Returns the store, or null when no database is configured. */
export function initEmailStore(config: Config): EmailStore | null {
  const status = storageStatus(config);
  if (!status.configured) {
    problem = status.problem ?? "No database configured.";
    return (store = null);
  }
  problem = null;
  return (store = createEmailMongoStore(config.db.uri!, config.db.name));
}

export function getEmailStore(): EmailStore | null {
  return store;
}

/** The store, or a 503 for the caller. */
export function requireEmailStore(): EmailStore {
  if (!store) throw new EmailUnavailableError(problem ?? "The email database is not configured.");
  return store;
}

export class EmailUnavailableError extends Error {}
