// Content for the title sheet (home page) that is not drawn from other collections.

export interface StackGroup { group: string; items: string[] }
export interface PracticeSummary { section: string; summary: string }

export interface HomeSheet {
  id: string;
  /** One-line summaries for the practices chapter's sections, keyed by section id. */
  practices: PracticeSummary[];
  stack: StackGroup[];
}

export const SEED_HOME: HomeSheet = {
  id: "home",
  practices: [
    { section: "write-it-down", summary: "Any change that crosses a team boundary starts as a short RFC. Decisions are recorded with the reasoning, so the next engineer knows why." },
    { section: "boring-by-default", summary: "We choose proven technology and spend novelty only where it buys something real for users." },
    { section: "accessible-or-unfinished", summary: "Keyboard, screen reader, RTL and low-bandwidth support are acceptance criteria, not polish." },
    { section: "privacy-review", summary: "Every new data flow gets a review against the amānah standard: collect less, keep less, explain everything." },
    { section: "ownership", summary: "A named team, a runbook and an on-call rotation, or it doesn't go to production." },
    { section: "blameless", summary: "Incidents produce learning, not scapegoats. Write-ups are shared across all houses." },
  ],
  stack: [
    { group: "Languages", items: ["TypeScript", "Go", "Python", "Rust"] },
    { group: "Web", items: ["Next.js", "React", "Node"] },
    { group: "Data", items: ["Postgres", "SQLite", "Parquet"] },
    { group: "Infra", items: ["Kubernetes", "Terraform", "OpenTelemetry"] },
  ],
};
