// Picks the AccountsStore implementation from this api's configuration. This service's data lives
// in its own database (itc_accounts) and only this api ever touches it (ARCHITECTURE.md, rule 2).
//
// The store is a singleton, set once at boot by initAccountsStore(). With no database configured
// every accounts endpoint answers 503.
import type { Config } from "../config.js";
import { createAccountsMongoStore } from "./mongo.js";
import type { AccountsStore } from "./types.js";

export const SUPPORTED_DATABASES = ["mongodb"] as const;

export interface StorageStatus {
  configured: boolean;
  kind: string;
  problem?: string;
}

export function storageStatus(config: Config): StorageStatus {
  const kind = config.db.kind;
  if (!(SUPPORTED_DATABASES as readonly string[]).includes(kind)) {
    return { configured: false, kind, problem: `ACCOUNTS_DB="${kind}" is not supported yet. Supported: ${SUPPORTED_DATABASES.join(", ")}.` };
  }
  if (kind === "mongodb" && !config.db.uri) {
    return { configured: false, kind, problem: "MONGODB_URI is not set. Add it to .env.local and restart the api." };
  }
  return { configured: true, kind };
}

let store: AccountsStore | null = null;
let problem: string | null = null;

/** Called once at boot. Returns the store, or null when no database is configured. */
export function initAccountsStore(config: Config): AccountsStore | null {
  const status = storageStatus(config);
  if (!status.configured) {
    problem = status.problem ?? "No database configured.";
    return (store = null);
  }
  problem = null;
  return (store = createAccountsMongoStore(config.db.uri!, config.db.name));
}

export function getAccountsStore(): AccountsStore | null {
  return store;
}

/** The store, or a 503 for the caller. */
export function requireAccountsStore(): AccountsStore {
  if (!store) throw new AccountsUnavailableError(problem ?? "The accounts database is not configured.");
  return store;
}

export class AccountsUnavailableError extends Error {}
