// Seed content for the home page's "Where we focus" cards and "From the lab" list.
// Editors manage the live version in the admin (singleton "home").

export interface FocusCard {
  tag: string;
  title: string;
  body: string;
  output: string;
  /** e.g. "AI × Research". */
  with: string;
  href: string;
}

export interface LabItem {
  type: string;
  title: string;
  href: string;
}

export interface HomeContent {
  id: "home";
  focus: FocusCard[];
  lab: LabItem[];
}

export const SEED_HOME: HomeContent = {
  id: "home",
  focus: [
    { tag: "evals", title: "Values-aware evaluation", body: "Benchmarks that test how models handle religious knowledge, cultural nuance and questions where the honest answer is “ask a scholar.”", output: "open benchmarks", with: "AI × Research", href: "/projects/honest-uncertainty" },
    { tag: "language", title: "Arabic & classical text", body: "Retrieval and language tools for classical Arabic, with sources cited down to the volume and page, never invented.", output: "models, datasets", with: "AI × Institute", href: "/projects/classical-corpus" },
    { tag: "privacy", title: "On-device by default", body: "Small, efficient models that run where the data lives, so personal questions stay personal.", output: "runtimes, SDKs", with: "AI × Engineering", href: "/projects/local-runtime" },
    { tag: "governance", title: "Policy & accountability", body: "Frameworks that help communities, mosques and schools decide when, and whether, to adopt AI tools.", output: "guides, toolkits", with: "AI × Institute", href: "/guides" },
  ],
  lab: [
    { type: "paper", title: "Measuring honest uncertainty in religious QA", href: "/projects/honest-uncertainty" },
    { type: "repo", title: "isnad-rag: retrieval with traceable chains of citation", href: "/projects/isnad-rag" },
    { type: "dataset", title: "A parallel corpus of classical Arabic and English", href: "/projects/classical-corpus" },
    { type: "guide", title: "AI adoption guide for community organizations", href: "/guides" },
  ],
};
