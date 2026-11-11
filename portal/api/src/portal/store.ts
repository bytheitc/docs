// Picks the PortalStore implementation from this api's configuration. The portal's data lives in its
// own database (itc_portal) and only this api ever touches it (ARCHITECTURE.md, rule 2).
//
// The store is a singleton, set once at boot by initPortalStore(). With no database configured the
// public pages still render from the CMS, and every portal endpoint answers 503.
import type { Config } from "../config.js";
import { createPortalMongoStore } from "./mongo.js";
import type { PortalStore } from "./types.js";

export const SUPPORTED_DATABASES = ["mongodb"] as const;

export interface StorageStatus {
  configured: boolean;
  kind: string;
  problem?: string;
}

export function storageStatus(config: Config): StorageStatus {
  const kind = config.db.kind;
  if (!(SUPPORTED_DATABASES as readonly string[]).includes(kind)) {
    return { configured: false, kind, problem: `PORTAL_DB="${kind}" is not supported yet. Supported: ${SUPPORTED_DATABASES.join(", ")}.` };
  }
  if (kind === "mongodb" && !config.db.uri) {
    return { configured: false, kind, problem: "MONGODB_URI is not set. Add it to .env.local and restart the api." };
  }
  return { configured: true, kind };
}

let store: PortalStore | null = null;
let problem: string | null = null;

/** Called once at boot. Returns the store, or null when no database is configured. */
export function initPortalStore(config: Config): PortalStore | null {
  const status = storageStatus(config);
  if (!status.configured) {
    problem = status.problem ?? "No database configured.";
    return (store = null);
  }
  problem = null;
  return (store = createPortalMongoStore(config.db.uri!, config.db.name));
}

export function getPortalStore(): PortalStore | null {
  return store;
}

/** The store, or a 503 for the caller. */
export function requirePortalStore(): PortalStore {
  if (!store) throw new PortalUnavailableError(problem ?? "The portal's database is not configured.");
  return store;
}

export class PortalUnavailableError extends Error {}
