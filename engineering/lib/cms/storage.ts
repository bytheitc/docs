// Picks the storage adapter from the environment. Identical in every app.
//
//   CMS_DB        which database to use: "mongodb" (default). Others plug in here.
//   MONGODB_URI   connection string for MongoDB (e.g. an Atlas cluster)
//   CMS_DB_NAME   database name; defaults to the house's name from lib/cms/config.ts
//
// With no database configured the public site still works: it reads each collection's
// built-in seed content, read-only, and the admin explains how to connect a database.
import { createMongoAdapter } from "@/lib/cms/adapters/mongodb";
import { CMS_CONFIG } from "@/lib/cms/config";
import type { StorageAdapter } from "@/lib/cms/types";

export const SUPPORTED_DATABASES = ["mongodb"] as const;
export type DatabaseKind = (typeof SUPPORTED_DATABASES)[number];

export interface StorageStatus {
  configured: boolean;
  kind: string;
  problem?: string;
}

export function storageStatus(): StorageStatus {
  const kind = (process.env.CMS_DB ?? "mongodb").toLowerCase();
  if (!SUPPORTED_DATABASES.includes(kind as DatabaseKind)) {
    return { configured: false, kind, problem: `CMS_DB="${kind}" is not supported yet. Supported: ${SUPPORTED_DATABASES.join(", ")}.` };
  }
  if (kind === "mongodb" && !process.env.MONGODB_URI) {
    return { configured: false, kind, problem: "MONGODB_URI is not set. Add it to .env.local and restart the server." };
  }
  return { configured: true, kind };
}

let cached: StorageAdapter | null | undefined;

/** The configured adapter, or null when no database is configured. */
export function getStorage(): StorageAdapter | null {
  if (cached !== undefined) return cached;
  const status = storageStatus();
  if (!status.configured) return (cached = null);
  switch (status.kind as DatabaseKind) {
    case "mongodb":
      return (cached = createMongoAdapter(process.env.MONGODB_URI!, process.env.CMS_DB_NAME ?? CMS_CONFIG.dbName));
  }
}

/** Like getStorage, but throws a readable error when no database is configured (admin-only paths). */
export function requireStorage(): StorageAdapter {
  const s = getStorage();
  if (!s) throw new Error(storageStatus().problem ?? "No database configured.");
  return s;
}
