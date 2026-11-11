// Open roles. Placeholder list: no real openings, salaries or locations.
import type { TeamSlug } from "./teams.js";

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

export const SEED_ROLES: Role[] = [
  { id: "r-01", title: "Platform Engineer, Identity", team: "platform", type: "Full-time", location: "Remote", summary: "Build Qibla's passkey and recovery flows." },
  { id: "r-02", title: "Site Reliability Engineer", team: "infrastructure", type: "Full-time", location: "Remote", summary: "Run Manara and make on-call humane." },
  { id: "r-03", title: "Security Engineer, Privacy", team: "security", type: "Part-time", location: "Remote", summary: "Lead amānah privacy reviews and help design Khazana." },
  { id: "r-04", title: "Front-end Engineer, Mizan", team: "product", type: "Full-time", location: "Remote", summary: "Build accessible, bilingual components for all five houses." },
  { id: "r-05", title: "Accessibility Reviewer", team: "product", type: "Volunteer", location: "Remote", summary: "Test interfaces with assistive technology and report what breaks." },
  { id: "r-06", title: "Docs Contributor", team: "developer-experience", type: "Volunteer", location: "Remote", summary: "Improve this handbook and the Bayt quick-start." },
  { id: "r-07", title: "Arabic Localisation Reviewer", team: "product", type: "Volunteer", location: "Remote", summary: "Review Arabic copy and right-to-left layouts." },
];

export interface Step { title: string; body: string }

/** Text for the careers page: how hiring and volunteering work, and where applications go. */
export interface CareersPage {
  id: string;
  email: string;
  hiring: Step[];
  volunteering: Step[];
}

export const roleCode = (id: string) => id.toUpperCase();

export const SEED_HIRING_STEPS: Step[] = [
  { title: "Apply", body: "A short note on why this work matters to you, and something you have built or written. No cover-letter theatre." },
  { title: "Conversation", body: "A call with someone from the team about the role, the collective and your questions." },
  { title: "Work sample", body: "A small, time-boxed exercise close to the real work, or a walk-through of something you have already made. Paid for full- and part-time roles." },
  { title: "Team interview", body: "Design discussion and code review with the team you would join. We assess reasoning, not trivia." },
  { title: "Decision", body: "A clear yes or no, with feedback if you want it." },
];

export const SEED_VOLUNTEER_STEPS: Step[] = [
  { title: "Say hello", body: "Email the team or pick an issue marked for volunteers on ITC Open Source." },
  { title: "First contribution", body: "Bayt gets you running in one command. A team member reviews your first change with you." },
  { title: "Stay as long as you like", body: "No minimum commitment, no pager duty, and credit for your work." },
];

export const SEED_CAREERS_PAGE: CareersPage = {
  id: "careers",
  email: "careers@example.org",
  hiring: SEED_HIRING_STEPS,
  volunteering: SEED_VOLUNTEER_STEPS,
};
