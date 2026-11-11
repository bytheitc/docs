// Requests for proposals: work the Collective wants built, put out for anyone to bid on.
// An RFP is a public, written brief — what is needed, who it serves, what "done" looks like and what
// is on offer — so that a small studio or a lone developer can answer it on the same footing.
import type { HouseId } from "@/lib/houses";

export const RFP_STATUSES = ["Open", "Reviewing", "Awarded", "Closed"] as const;
export type RfpStatus = (typeof RFP_STATUSES)[number];

export interface RfpSection {
  heading: string;
  body: string[];
}

export interface Rfp {
  slug: string;
  title: string;
  /** The house that will steward the work. */
  house: HouseId;
  status: RfpStatus;
  /** Free text, e.g. "£15,000–£25,000" or "To be agreed". Never a hidden number. */
  budget: string;
  /** Free text, e.g. "28 February 2027" or "Rolling". */
  closes: string;
  /** Expected length of the engagement. */
  duration: string;
  summary: string;
  /** Who is underserved today, and what changes for them. */
  need: string[];
  /** What a proposal must cover. */
  scope: string[];
  /** What the Collective will judge proposals against, in order. */
  criteria: string[];
  /** Non-negotiables: licence, data handling, accessibility, scholarly review. */
  conditions: string[];
  sections?: RfpSection[];
}
