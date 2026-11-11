// Picks the PortalStore implementation from the same env vars as the CMS (CMS_DB, MONGODB_URI, CMS_DB_NAME).
import { CMS_CONFIG } from "@/lib/cms/config";
import { storageStatus } from "@/lib/cms/storage";
import { createPortalMongoStore } from "@/lib/portal/mongo";
import type { PortalStore } from "@/lib/portal/types";

let cached: PortalStore | null | undefined;

export function getPortalStore(): PortalStore | null {
  if (cached !== undefined) return cached;
  const status = storageStatus();
  if (!status.configured) return (cached = null);
  switch (status.kind) {
    case "mongodb":
      return (cached = createPortalMongoStore(process.env.MONGODB_URI!, process.env.CMS_DB_NAME ?? CMS_CONFIG.dbName));
    default:
      return (cached = null);
  }
}

export function requirePortalStore(): PortalStore {
  const s = getPortalStore();
  if (!s) throw new Error(storageStatus().problem ?? "No database configured.");
  return s;
}
