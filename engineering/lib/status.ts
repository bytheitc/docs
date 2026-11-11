// Status sheet data. Not connected to monitoring: every reading is "no data" / "—" until real values are entered.
// Never invent uptime numbers here; enter measured values in the admin once a feed exists.

export const STATUS_VALUES = ["no data", "operational", "degraded", "partial outage", "major outage", "maintenance"] as const;
export type StatusValue = (typeof STATUS_VALUES)[number];

export interface StatusReading {
  /** Platform slug. */
  platform: string;
  current: StatusValue;
  /** Measured 90-day uptime, e.g. "99.95%". Empty shows "—". */
  uptime?: string;
  /** Date or reference of the last incident. Empty shows "—". */
  lastIncident?: string;
}

export interface StatusIncident {
  date: string;
  title: string;
  severity?: string;
  summary?: string;
  /** Link to the published review, if any. */
  href?: string;
}

export interface StatusSheet {
  id: string;
  /** Whether a live feed is connected, e.g. "not connected". */
  feed: string;
  lastChecked?: string;
  openIncidents?: string;
  /** Shown as a banner while the page is not backed by real data. Empty hides it. */
  banner?: string;
  readings: StatusReading[];
  incidents: StatusIncident[];
}

/** Chip style for a status value (see `.status.*` in globals.css). */
export const statusChip = (v: StatusValue) =>
  v === "operational" ? "stable" : v === "degraded" || v === "partial outage" ? "beta" : v === "major outage" ? "outage" : v === "maintenance" ? "design" : "unknown";

export const SEED_STATUS: StatusSheet = {
  id: "status",
  feed: "not connected",
  lastChecked: "—",
  openIncidents: "—",
  banner: "PLACEHOLDER · No live data. Do not rely on this page for operational decisions.",
  readings: ["qibla", "manara", "khazana", "mizan", "bayt"].map((platform) => ({ platform, current: "no data" as const })),
  incidents: [],
};
