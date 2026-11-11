// Engineering handbook chapters. Placeholder copy: review with each owning team before launch.
import type { DocSection } from "@/lib/content";
import type { TeamSlug } from "@/lib/teams";

export interface Chapter {
  slug: string;
  num: string;
  title: string;
  summary: string;
  owner: TeamSlug;
  revision: string;
  sections: DocSection[];
}
