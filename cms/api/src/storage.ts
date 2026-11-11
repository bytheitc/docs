// Picks the storage adapter from the configuration.
//
//   CMS_DB        which database to use: "mongodb" (default). Others plug in here: implement
//                 StorageAdapter (src/types.ts) in src/adapters/<db>.ts and add it below.
//   MONGODB_URI   connection string for MongoDB
//   CMS_DB_NAME   database name (itc_cms)
import { createMongoAdapter } from "./adapters/mongodb.js";
import type { Config } from "./config.js";
import type { StorageAdapter } from "./types.js";

export const SUPPORTED_DATABASES = ["mongodb"] as const;
export type DatabaseKind = (typeof SUPPORTED_DATABASES)[number];

export interface StorageStatus {
  configured: boolean;
  kind: string;
  problem?: string;
}

export function storageStatus(config: Config): StorageStatus {
  const kind = config.db.kind;
  if (!SUPPORTED_DATABASES.includes(kind as DatabaseKind)) {
    return { configured: false, kind, problem: `CMS_DB="${kind}" is not supported yet. Supported: ${SUPPORTED_DATABASES.join(", ")}.` };
  }
  if (kind === "mongodb" && !config.db.uri) {
    return { configured: false, kind, problem: "MONGODB_URI is not set." };
  }
  return { configured: true, kind };
}

/** Creates the configured adapter, or throws a readable error. */
export function createStorage(config: Config): StorageAdapter {
  const status = storageStatus(config);
  if (!status.configured) throw new Error(status.problem);
  switch (status.kind as DatabaseKind) {
    case "mongodb":
      return createMongoAdapter(config.db.uri!, config.db.name);
  }
}
