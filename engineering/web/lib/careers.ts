// Open roles. Placeholder list: no real openings, salaries or locations.
import type { TeamSlug } from "@/lib/teams";

export const ROLE_TYPES = ["Full-time", "Part-time", "Volunteer"] as const;
export type RoleType = (typeof ROLE_TYPES)[number];

export interface Role {
  /** Lowercase id, e.g. "r-01"; shown in capitals (R-01). */
  id: string;
  title: string;
  team: TeamSlug;
  type: RoleType;
  location: string;
  summary: string;
}

export interface Step { title: string; body: string }

/** Text for the careers page: how hiring and volunteering work, and where applications go. */
export interface CareersPage {
  id: string;
  email: string;
  hiring: Step[];
  volunteering: Step[];
}

export const roleCode = (id: string) => id.toUpperCase();
