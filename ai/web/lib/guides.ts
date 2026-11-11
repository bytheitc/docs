import type { PrincipleId } from "@/lib/charter";

// Seed content: editors manage the live version in the admin (collection "guides").
// Adoption guides. Placeholder long-form content: review with partner organisations before launch.
// These guides are not legal advice and do not offer religious rulings.

export interface GuideSection {
  id: string;
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  audience: string;
  title: string;
  dek: string;
  principles: PrincipleId[];
  sections: GuideSection[];
  checklist: string[];
}

/** Rough reading time, computed from the guide's own text. */
export function readingMinutes(g: Guide): number {
  const words = [g.dek, ...g.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? [])]), ...g.checklist]
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
