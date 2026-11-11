// Seed content for the contributors wall (editable in the admin: Contributors, Contribution kinds).
// Intentionally empty: names are added by maintainers for real contributions, never invented.
export interface Contributor {
  handle: string; // GitHub handle, without the @ (stored lowercase: handles are case-insensitive)
  name?: string;
  kinds: string[]; // contribution kind ids, e.g. "code", "docs"
  repos: string[]; // repo slugs
}

export const SEED_CONTRIBUTORS: Contributor[] = [];

export interface ContributionKindInfo {
  kind: string;
  label: string;
  body: string;
}

export const SEED_CONTRIBUTION_KINDS: ContributionKindInfo[] = [
  { kind: "code", label: "CODE", body: "A merged pull request in any repo." },
  { kind: "docs", label: "DOCS", body: "Guides, READMEs, examples, typo fixes. All of it counts." },
  { kind: "review", label: "REVIEW", body: "Reviewing pull requests with care." },
  { kind: "translation", label: "TRANSLATION", body: "Docs or UI strings in another language." },
  { kind: "design", label: "DESIGN", body: "Interface, accessibility or visual design work." },
  { kind: "triage", label: "TRIAGE", body: "Reproducing bugs, labeling and closing stale issues." },
  { kind: "tests", label: "TESTS", body: "Tests that make a library more trustworthy." },
  { kind: "sprints", label: "SPRINTS", body: "Organising or mentoring at a Commons Sprint." },
];
