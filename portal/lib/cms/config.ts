// House-specific CMS settings for the ITC contributor portal (a Collective-level service).
export const CMS_CONFIG = {
  house: "site",
  /** Shown in the admin's header. */
  title: "Portal Studio",
  /** Default MongoDB database name (override with CMS_DB_NAME). */
  dbName: "itc_portal",
} as const;
