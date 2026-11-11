// Engineering write-ups and blameless incident reviews. Placeholder posts: no real incidents or people.
import type { DocSection } from "@/lib/content";
import type { TeamSlug } from "@/lib/teams";

export const POST_KINDS = ["write-up", "incident review"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export interface Post {
  slug: string;
  num: string;
  kind: PostKind;
  title: string;
  dek: string;
  team: TeamSlug;
  date: string; // "—" until real
  platforms: string[];
  /** Incident reviews only: a fact sheet. Values stay "—" until real. */
  facts?: [string, string][];
  sections: DocSection[];
}
