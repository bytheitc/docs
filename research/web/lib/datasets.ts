// Placeholder datasheets. Values that are not yet known are null and render as "pending".
import type { Group } from "@/lib/publications";

export type DatasetStatus = "Released" | "In preparation" | "Not released";

/** null means the value is not yet known; it renders as "pending". */
export type Field = string | null;

export interface DatasheetSection {
  key: string;
  title: string;
  /** Question-and-answer pairs, in the order a datasheet asks them. */
  items: { q: string; a: Field }[];
}

export interface Dataset {
  slug: string;
  title: string;
  group: Group;
  status: DatasetStatus;
  version: Field;
  licence: Field;
  /** Publication id that describes or uses the dataset. */
  pubId?: string;
  summary: string;
  sections: DatasheetSection[];
}
