// Shared platforms registry. Placeholder: interfaces, roadmaps and runbooks are illustrative.
import type { TeamSlug } from "@/lib/teams";

export const PLATFORM_STATUSES = ["stable", "beta", "design"] as const;
export type PlatformStatus = (typeof PLATFORM_STATUSES)[number];
export const PHASES = ["done", "now", "next", "later"] as const;
export type Phase = (typeof PHASES)[number];

export interface Platform {
  slug: string;
  id: string;
  name: string;
  arabic: string;
  transliteration: string;
  gloss: string;
  purpose: string;
  summary: string;
  owner: TeamSlug;
  status: PlatformStatus;
  principles: string[];
  interfaces: { name: string; kind: string; surface: string; note: string }[];
  dependencies: { name: string; ref?: string; kind: "platform" | "external"; note: string }[];
  roadmap: { phase: Phase; title: string; note: string }[];
  runbook: { path: string; covers: string[] };
}

export const findPlatform = (platforms: Platform[], slug: string): Platform | undefined => platforms.find((p) => p.slug === slug);
export const platformsOwnedBy = (platforms: Platform[], team: TeamSlug): Platform[] => platforms.filter((p) => p.owner === team);
