import type { HouseId } from "@/lib/houses";
import type { PrincipleId } from "@/lib/charter";

// Seed content: editors manage the live version in the admin (collection "projects").
// Placeholder projects. Replace with real releases, repositories and papers before launch.

export const PROJECT_KINDS = ["model", "eval", "tool", "dataset", "guide"] as const;
export const PROJECT_STATUSES = ["exploring", "in development", "community review", "piloting"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectLink {
  label: string;
  house: HouseId;
  /** Short note describing what lives there. */
  note: string;
  /** Exact address, once it exists. Without it the link goes to the house's home page. */
  url?: string;
}

export interface Project {
  slug: string;
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  tagline: string;
  summary: string;
  body: string[];
  goals: string[];
  principles: PrincipleId[];
  houses: { id: HouseId; role: string }[];
  links: ProjectLink[];
  modelCard?: string;
  evals?: string[];
  guide?: string;
}
