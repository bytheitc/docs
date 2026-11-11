// Seed content for Commons Sprints (editable in the admin): short, focused, time-boxed pushes on one theme.
// All dates TBA, all content placeholder.
export type SprintStatus = "upcoming" | "past";

export interface Sprint {
  slug: string;
  code: string; // short id, e.g. "CS-03"
  title: string;
  status: SprintStatus;
  dates: string;
  format: string;
  theme: string;
  summary: string;
  repos: string[]; // repo slugs
  goals: string[];
  schedule: { when: string; what: string }[];
  /** For past sprints: what to read. Never invented numbers. */
  outcome?: string;
}

export const SPRINT_STATUSES: SprintStatus[] = ["upcoming", "past"];
