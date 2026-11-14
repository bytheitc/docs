// Built-in portal copy and configuration. Seeds the CMS; also the read-only fallback with no database.
// Pure data: never import lib/cms/* or lib/data.ts from here.
import type { HouseId } from "./houses.js";

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

export const SEED_LANDING: LandingCopy[] = [{
  id: "landing",
  headline: "Your contributions, gathered with care.",
  intro: "Connect the platforms you already contribute on. The portal brings your work for every ITC house together on one private dashboard, and keeps it yours.",
  steps: [
    { title: "Sign in with a platform you use", body: "GitHub, GitLab, Codeberg, Hugging Face, ORCID, Wikimedia or Crowdin. We ask for your identity only, never access to your repositories or edits." },
    { title: "Link the others", body: "Add every account you contribute from. Work you did before you joined attaches automatically." },
    { title: "Log what no platform tracks", body: "Writing, design, teaching, reviews: record it with a link, and a steward confirms it." },
    { title: "See your path, not a leaderboard", body: "Private milestones mark your progress. If you want, open a public profile or join the contributors wall." },
  ],
  privacy: [
    "Identity only. We store your account id, username, display name, avatar and profile link. Your access token is used once to read that, then discarded.",
    "Your contributions are read from the Collective’s own repositories and public records, using the Collective’s credentials, never yours.",
    "No ranking. There are no points, no leaderboards and no comparisons between people.",
    "Nothing is public unless you turn it on. You can export everything we hold about you, or delete it all, at any time.",
  ],
  wallIntro: "People who have chosen to be listed. In alphabetical order, because every contribution counts the same here.",
}];

export const SEED_FAQ: Faq[] = [
  { id: "why-sign-in", question: "Why do I sign in with another platform?", answer: "So we never hold a password for you, and so we can match the work you have already done to you. We only ask the platform who you are." },
  { id: "what-counts", question: "What counts as a contribution?", answer: "Pull and merge requests, issues, models and datasets, research works, wiki edits and translations in places the Collective tracks, plus anything you log yourself and a steward confirms." },
  { id: "ranking", question: "Is there a leaderboard?", answer: "No. Contribution is an amanah, not a competition. Your numbers are visible to you alone." },
  { id: "delete", question: "How do I leave?", answer: "Go to Your data and delete your account. Your linked accounts, sessions, claims and contributions are removed straight away." },
];

// Placeholder sources: inactive until an admin fills in the Collective's real organisations.
export const SEED_SOURCES: SourceDef[] = [
  { id: "github-oss", label: "Open Source organisation on GitHub", provider: "github", owner: "islamic-tech-collective", house: "oss", active: false, notes: "Placeholder organisation name." },
  { id: "github-engineering", label: "Engineering platform repositories", provider: "github", owner: "itc-engineering", house: "engineering", active: false, notes: "Placeholder." },
  { id: "hf-ai", label: "AI models and datasets", provider: "huggingface", owner: "itc-ai", house: "ai", active: false, notes: "Placeholder." },
  { id: "orcid-research", label: "Research works of linked ORCID iDs", provider: "orcid", house: "research", active: false },
  { id: "wikipedia-islamic-art", label: "Wikipedia: Islamic geometric patterns", provider: "wikimedia", owner: "en.wikipedia.org", page: "Islamic geometric patterns", house: "institute", active: false, notes: "Example of a tracked wiki page." },
];

export const SEED_MILESTONES: MilestoneDef[] = [
  { id: "first-contribution", title: "First contribution", description: "Your first piece of work for the Collective. Bismillah.", rule: "contributions", threshold: 1 },
  { id: "first-merged", title: "First merged pull request", description: "Your first change merged into a Collective codebase.", rule: "merged", threshold: 1 },
  { id: "three-houses", title: "Across three houses", description: "You have contributed to three of the Collective’s houses.", rule: "houses", threshold: 3 },
  { id: "two-platforms", title: "Many hands", description: "You contribute on two or more platforms.", rule: "providers", threshold: 2 },
  { id: "first-verified-log", title: "Work beyond the code", description: "A steward confirmed work you logged yourself.", rule: "verified-self", threshold: 1 },
  { id: "first-translation", title: "First translation", description: "You carried the Collective’s words into another language.", rule: "kind", threshold: 1, kind: "translation" },
];

export const SEED_SETTINGS: PortalSettings[] = [{
  id: "settings",
  claimDays: 7,
  goodFirstIssues: "Suggested good first issues from the Open Source house will appear here.",
}];

/** A registered "Sign in with ITC" client. Editors manage these; see oauth/clients.ts. */
export interface OAuthClientDef {
  clientId: string;
  name: string;
  type: "public" | "confidential";
  secretHash?: string;
  redirectUris: string[];
  allowedScopes: string[];
  trusted: boolean;
  homepage?: string;
  active: boolean;
}

/**
 * Built-in clients. The contributor app is public — an installed app cannot keep a secret, which
 * is exactly the case PKCE exists for — and trusted, because the collective ships it, so it does
 * not ask the person to approve the collective's own app on every sign-in.
 */
export const SEED_OAUTH_CLIENTS: OAuthClientDef[] = [
  {
    clientId: "itc-mobile",
    name: "ITC (the contributor app)",
    type: "public",
    redirectUris: ["itc://auth"],
    allowedScopes: ["openid", "profile", "contributions", "entitlements", "offline_access"],
    trusted: true,
    active: true,
  },
];
