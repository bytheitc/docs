// Built-in portal copy and configuration. Seeds the CMS; also the read-only fallback with no database.
// Pure data: never import lib/cms/* or lib/data.ts from here.
import type { HouseId } from "@/lib/houses";

export interface LandingCopy {
  id: string;
  headline: string;
  intro: string;
  steps: { title: string; body: string }[];
  privacy: string[];
  wallIntro: string;
}

export interface Faq { id: string; question: string; answer: string }

export interface SourceDef {
  id: string;
  label: string;
  provider: string;
  owner?: string;
  repo?: string;
  page?: string;
  baseUrl?: string;
  house: HouseId;
  active: boolean;
  notes?: string;
}

export const MILESTONE_RULES = ["contributions", "merged", "houses", "providers", "kind", "verified-self"] as const;
export type MilestoneRule = (typeof MILESTONE_RULES)[number];

export interface MilestoneDef {
  id: string;
  title: string;
  description: string;
  rule: MilestoneRule;
  threshold: number;
  kind?: string;
}

export interface PortalSettings { id: string; claimDays: number; goodFirstIssues: string }
