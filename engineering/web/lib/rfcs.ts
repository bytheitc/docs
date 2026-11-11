// Public design decisions. Placeholder RFCs: illustrative of format and tone only.
import type { Block } from "@/lib/content";
import type { TeamSlug } from "@/lib/teams";

export const RFC_STATUSES = ["draft", "proposed", "accepted", "superseded", "withdrawn"] as const;
export type RfcStatus = (typeof RFC_STATUSES)[number];

export interface Rfc {
  id: string; // "0001"
  title: string;
  status: RfcStatus;
  team: TeamSlug;
  date: string; // "—" until real
  platforms: string[]; // platform slugs
  summary: string;
  motivation: Block[];
  design: Block[];
  alternatives: Block[];
  decision: Block[];
  supersededBy?: string;
}
