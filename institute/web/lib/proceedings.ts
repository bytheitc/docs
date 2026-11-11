// Proceedings archive. Placeholder volumes: titles and contents are illustrative only.
// The seed volumes live in institute/api; pages read the published list via lib/data.ts.
import type { Center } from "@/lib/centers";

export interface Paper {
  title: string;
  author: string;
  /** Optional link to a center. */
  center?: Center["slug"];
}

export const VOLUME_STATUSES = ["In preparation", "Forthcoming", "Published"] as const;
export type VolumeStatus = (typeof VOLUME_STATUSES)[number];

export interface Volume {
  year: string;
  roman: string;
  title: string;
  status: VolumeStatus;
  note: string[];
  papers: Paper[];
}

