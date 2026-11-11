// Seed content: editors manage the live version in the admin (collections "calls" and "collaborate").
// Open calls for collaborators. Placeholder: replace with real calls and contacts before launch.

/** A call's id (slug), e.g. researcher. */
export type RoleId = string;

export interface Call {
  id: RoleId;
  title: string;
  lede: string;
  youd: string[];
  bring: string[];
}

export const SEED_CALLS: Call[] = [
  {
    id: "researcher",
    title: "Researchers",
    lede: "Help us measure what matters: honesty, fairness and privacy in systems that touch religious life.",
    youd: ["Co-design benchmarks like honest-uncertainty and lahja-bench", "Analyse results and co-author papers with ITC Research", "Review methods before they are published"],
    bring: ["Experience in NLP, evaluation, HCI or a related field", "Comfort publishing negative results"],
  },
  {
    id: "scholar",
    title: "Scholars",
    lede: "Our systems defer to scholars. We need scholars to tell us where, how and whether they are getting that right.",
    youd: ["Review how models respond to religious questions", "Advise on which questions a tool should never answer", "Help select texts and editions for corpora"],
    bring: ["Recognised training in the Islamic sciences", "Interest in how people actually seek knowledge today"],
  },
  {
    id: "engineer",
    title: "Engineers",
    lede: "Build the tools: on-device runtimes, retrieval with real citations, and the evaluation harnesses behind every release.",
    youd: ["Contribute to isnad-rag and the local-first runtime", "Harden data retention and deletion paths", "Improve reproducibility of published results"],
    bring: ["Experience with ML systems, mobile or infrastructure", "Care for the boring parts: tests, docs, deletion"],
  },
  {
    id: "partner",
    title: "Community partners",
    lede: "Mosques, schools and nonprofits who want to shape the tools and guides before they are finished.",
    youd: ["Pilot a guide or tool with the right to stop at any time", "Join a project's review circle", "Tell us what your community actually needs"],
    bring: ["A real problem you are trying to solve", "Willingness to give honest feedback"],
  },
];

/** Settings for the interest form on /collaborate. */
export interface CollaborateSettings {
  id: "collaborate";
  /** The "areas of interest" checkboxes. */
  interests: string[];
}

export const SEED_COLLABORATE: CollaborateSettings = {
  id: "collaborate",
  interests: ["evaluation", "classical Arabic", "on-device & privacy", "adoption & policy", "scholar review"],
};
