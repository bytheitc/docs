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

const STANDARD_SCHEDULE = [
  { when: "DAY 0", what: "Kickoff call: goals, issue board, pair-up. Recorded for later time zones." },
  { when: "DAY 1–4", what: "Build. Maintainers on call in chat for reviews and unblocking." },
  { when: "DAY 5", what: "Demo call: everyone shows what they shipped, merged or learned." },
];

export const SEED_SPRINTS: Sprint[] = [
  {
    slug: "rtl-everywhere",
    code: "CS-03",
    title: "RTL EVERYWHERE",
    status: "upcoming",
    dates: "TBA",
    format: "Online · 5 days",
    theme: "Right-to-left, done right",
    summary: "One week to make every ITC component and doc page work properly in Arabic, Urdu and Persian layouts. Mirrored icons, logical properties, bidi text that doesn't break.",
    repos: ["mizan-ui", "hijri-kit", "khatam"],
    goals: [
      "Close every RTL-labeled issue in mizan-ui",
      "Add RTL screenshots to every component's docs",
      "Pair first-timers with a reviewer for their first PR",
    ],
    schedule: STANDARD_SCHEDULE,
  },
  {
    slug: "docs-week",
    code: "CS-04",
    title: "DOCS WEEK",
    status: "upcoming",
    dates: "TBA",
    format: "Online · 5 days",
    theme: "If it isn't documented, it doesn't exist",
    summary: "No code required. Write guides, fix examples, translate READMEs and explain the hard parts. The best sprint for your first contribution.",
    repos: ["salah-times", "zakat-calc", "arabic-norm", "isnad-rag"],
    goals: [
      "Every repo has a getting-started guide that works copy-paste",
      "Every configuration option in zakat-calc documented with its source",
      "README translations into at least one more language per repo",
    ],
    schedule: STANDARD_SCHEDULE,
  },
  {
    slug: "bootstrap",
    code: "CS-01",
    title: "BOOTSTRAP",
    status: "past",
    dates: "TBA",
    format: "Online · 3 days",
    theme: "Make every repo boot with one command",
    summary: "The first Commons Sprint. The goal was simple: `bayt up` in any repo, on any machine, and you're running.",
    repos: ["bayt"],
    goals: [
      "A bayt.toml in every repo",
      "bayt doctor that explains what's missing",
      "A contributing guide that matches reality",
    ],
    schedule: [
      { when: "DAY 0", what: "Kickoff and repo audit" },
      { when: "DAY 1–2", what: "Build and review" },
      { when: "DAY 3", what: "Demo and retro" },
    ],
    outcome: "Write-up and retro notes to be published. Placeholder.",
  },
  {
    slug: "test-the-calculators",
    code: "CS-02",
    title: "TEST THE CALCULATORS",
    status: "past",
    dates: "TBA",
    format: "Hybrid · 5 days",
    theme: "Trust comes from tests",
    summary: "Prayer times and zakat are things people rely on. This sprint wrote the tests that make that trust earned, not assumed.",
    repos: ["salah-times", "zakat-calc", "hijri-kit"],
    goals: [
      "Property tests for salah-times against reference tables",
      "Threshold tests for zakat-calc nisab calculations",
      "Round-trip tests for hijri-kit conversions",
    ],
    schedule: STANDARD_SCHEDULE,
    outcome: "Write-up and retro notes to be published. Placeholder.",
  },
];

export const SPRINT_STATUSES: SprintStatus[] = ["upcoming", "past"];
