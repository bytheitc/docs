import type { HouseId } from "@/lib/houses";
import type { PrincipleId } from "@/lib/charter";

// Seed content: editors manage the live version in the admin (collection "projects").
// Placeholder projects. Replace with real releases, repositories and papers before launch.

export const PROJECT_KINDS = ["model", "eval", "tool", "dataset", "guide"] as const;
export const PROJECT_STATUSES = ["exploring", "in development", "community review", "piloting"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectLink {
  label: string;
  house: HouseId;
  /** Short note describing what lives there. */
  note: string;
  /** Exact address, once it exists. Without it the link goes to the house's home page. */
  url?: string;
}

export interface Project {
  slug: string;
  name: string;
  kind: ProjectKind;
  status: ProjectStatus;
  tagline: string;
  summary: string;
  body: string[];
  goals: string[];
  principles: PrincipleId[];
  houses: { id: HouseId; role: string }[];
  links: ProjectLink[];
  modelCard?: string;
  evals?: string[];
  guide?: string;
}

export const SEED_PROJECTS: Project[] = [
  {
    slug: "isnad-rag",
    name: "isnad-rag",
    kind: "tool",
    status: "in development",
    tagline: "Retrieval with traceable chains of citation.",
    summary: "A retrieval-augmented generation toolkit where every claim is tied to a source passage, and every source to its edition, volume and page.",
    body: [
      "In the hadith sciences, an isnād is the chain of transmitters that lets a reader trace a report back to its origin. isnad-rag borrows the idea, not the authority: every sentence a system generates should carry a chain back to the exact passage it came from, so a reader can check it instead of trusting it.",
      "The toolkit handles ingestion of classical texts with their edition metadata, chunking that respects the structure of the text (chapter, section, report), and a generation step that refuses to cite anything it cannot resolve. If no passage supports an answer, the system says so.",
    ],
    goals: [
      "Citations resolve to edition, volume and page, or are not shown.",
      "Quotations are reproduced exactly from the source text, never paraphrased inside quotation marks.",
      "Retrieval quality reported separately for classical and modern Arabic.",
    ],
    principles: ["sidq", "ilm"],
    houses: [
      { id: "oss", role: "maintains the open repository" },
      { id: "institute", role: "advises on texts, editions and scholarly review" },
    ],
    links: [
      { label: "Repository", house: "oss", note: "source, issues and roadmap" },
      { label: "Design notes", house: "research", note: "method write-up (forthcoming)" },
    ],
    modelCard: "isnad-embed",
    evals: ["citation-fidelity"],
  },
  {
    slug: "honest-uncertainty",
    name: "Honest uncertainty",
    kind: "eval",
    status: "community review",
    tagline: "Does the model know when to say “I don't know”?",
    summary: "An open benchmark that measures whether a model abstains, hedges or refers people to a scholar when it should, and whether it over-refuses when it shouldn't.",
    body: [
      "Most benchmarks reward a model for answering. This one rewards it for answering well, which sometimes means not answering. Items are written so that the right response is one of: a direct answer, an answer with stated uncertainty, a survey of established positions, or a referral to a qualified person.",
      "Items touching religious practice are drafted and reviewed with scholars advising the collective. The benchmark does not grade a model's religious opinions. It grades whether the model knows that issuing one is not its role.",
    ],
    goals: [
      "Separate scores for appropriate deferral, fabrication and over-refusal.",
      "Items in English, Modern Standard Arabic and selected dialects.",
      "Scoring rubric and code released openly with the item set.",
    ],
    principles: ["sidq", "adl", "ilm"],
    houses: [
      { id: "research", role: "co-authors the method and paper" },
      { id: "institute", role: "convenes scholar reviewers" },
      { id: "oss", role: "hosts the item set and harness" },
    ],
    links: [
      { label: "Paper", house: "research", note: "“Measuring honest uncertainty in religious QA” (draft)" },
      { label: "Benchmark harness", house: "oss", note: "items, rubric and scoring code" },
    ],
    evals: ["honest-uncertainty"],
  },
  {
    slug: "lahja-bench",
    name: "lahja-bench",
    kind: "eval",
    status: "exploring",
    tagline: "Fairness across Arabic dialects, measured per group.",
    summary: "A parity benchmark that asks the same questions in several Arabic dialects and in classical Arabic, and reports the gap between the best- and worst-served groups.",
    body: [
      "Lahja means dialect. A system that answers well in Modern Standard Arabic and poorly in the Arabic people actually speak at home has a fairness problem, even if its average score looks fine.",
      "lahja-bench pairs semantically equivalent prompts across dialects so differences in quality can be attributed to language variety rather than content. Dialect coverage is being scoped with native speakers; we would rather cover fewer dialects well than many badly.",
    ],
    goals: [
      "Per-dialect results, never only an average.",
      "A published worst-group gap for each system evaluated.",
      "Prompts written by native speakers, not machine-translated.",
    ],
    principles: ["adl", "shura"],
    houses: [
      { id: "research", role: "study design and analysis" },
      { id: "oss", role: "dataset hosting and licensing" },
    ],
    links: [
      { label: "Scoping notes", house: "research", note: "dialect selection rationale (in progress)" },
      { label: "Dataset", house: "oss", note: "to be released with the first results" },
    ],
    evals: ["lahja-bench"],
  },
  {
    slug: "local-runtime",
    name: "Local-first runtime",
    kind: "tool",
    status: "in development",
    tagline: "Small models that run where the data lives.",
    summary: "A lightweight runtime and SDK for running ITC models on phones and laptops, so personal questions never need to leave the device.",
    body: [
      "Privacy policies can change; physics doesn't. If a question is answered on the device, there is nothing on a server to leak, subpoena or sell. The local-first runtime makes that the easy path for developers building on ITC models.",
      "The runtime packages quantised models, a small retrieval index and the safety behaviours from the assistant model into a single bundle. Network access is opt-in and visible to the user.",
    ],
    goals: [
      "Runs offline by default on common phones and laptops.",
      "No telemetry without explicit opt-in.",
      "Same refusal and referral behaviour as the hosted model.",
    ],
    principles: ["amanah", "sidq"],
    houses: [
      { id: "engineering", role: "runtime, packaging and performance work" },
      { id: "oss", role: "SDK releases and documentation" },
    ],
    links: [
      { label: "SDK repository", house: "oss", note: "runtime and bindings" },
      { label: "Engineering notes", house: "engineering", note: "architecture and build guides" },
    ],
    modelCard: "itc-assistant-small",
  },
  {
    slug: "itc-assistant",
    name: "itc-assistant",
    kind: "model",
    status: "in development",
    tagline: "A small assistant tuned for honesty about its limits.",
    summary: "A compact instruction-tuned model designed to run on-device, with deferral to qualified scholars built into its behaviour rather than bolted on.",
    body: [
      "itc-assistant is the model behind the demo on our home page. Its job is modest: help people find, read and understand sources, and be plain about what it cannot do. It is not a mufti, a counsellor or a teacher, and it is tuned to say so.",
      "We are training it small on purpose. A model that fits on a phone can keep conversations private, and a model with a narrow job is easier to evaluate honestly.",
    ],
    goals: [
      "Passes the honest-uncertainty release gate before any public build.",
      "Runs within the local-first runtime on mid-range devices.",
      "Ships with a complete model card on day one.",
    ],
    principles: ["amanah", "sidq", "adl"],
    houses: [
      { id: "engineering", role: "training infrastructure and on-device builds" },
      { id: "research", role: "evaluation design" },
      { id: "institute", role: "scholar review of behaviour" },
    ],
    links: [
      { label: "Weights & code", house: "oss", note: "released with the first public build" },
      { label: "Evaluation report", house: "research", note: "published at release" },
    ],
    modelCard: "itc-assistant-small",
    evals: ["honest-uncertainty", "lahja-bench", "amanah-probe"],
  },
  {
    slug: "classical-corpus",
    name: "Classical Arabic–English corpus",
    kind: "dataset",
    status: "exploring",
    tagline: "A parallel corpus with provenance on every line.",
    summary: "A sentence-aligned corpus of classical Arabic texts and existing English translations, with edition, translator and licence recorded for every pair.",
    body: [
      "Good tools for classical Arabic need good data, and good data needs provenance. Each aligned pair in the corpus records the edition of the Arabic text, the translation it is paired with, and the terms under which both may be used.",
      "We include only texts and translations whose licences permit it. Where permission is unclear, we leave the text out. The alignment model used to build the corpus is documented separately.",
    ],
    goals: [
      "Every pair traceable to edition and translation.",
      "Licence recorded per source; nothing included on assumption.",
      "Alignment quality reviewed by bilingual readers.",
    ],
    principles: ["amanah", "ilm"],
    houses: [
      { id: "institute", role: "text selection and scholarly review" },
      { id: "oss", role: "dataset release and licensing" },
    ],
    links: [
      { label: "Dataset", house: "oss", note: "datasheet and download (forthcoming)" },
      { label: "Data statement", house: "research", note: "collection method and limits" },
    ],
    modelCard: "classical-align",
  },
  {
    slug: "adoption-guide",
    name: "Community adoption guides",
    kind: "guide",
    status: "piloting",
    tagline: "Deciding when, and whether, to adopt AI.",
    summary: "Plain-language guides that help mosques, schools and nonprofits decide whether an AI tool belongs in their work, and how to adopt it responsibly if it does.",
    body: [
      "Most organisations meet AI through a sales pitch. These guides start from the other end: what is your community trying to do, what could go wrong, and who needs to be in the room before you decide.",
      "Each guide includes questions to ask vendors, a data checklist and a simple way to run a small, reversible pilot. They are written to be read by committees, not engineers.",
    ],
    goals: [
      "Readable by a volunteer board in one sitting.",
      "Every recommendation tied to a charter principle.",
      "Revised after each partner pilot.",
    ],
    principles: ["shura", "amanah"],
    houses: [
      { id: "institute", role: "co-authors and runs partner workshops" },
      { id: "site", role: "distributes through the collective's network" },
    ],
    links: [
      { label: "Workshops", house: "institute", note: "guided sessions for partner organisations" },
      { label: "The collective", house: "site", note: "news and partner network" },
    ],
    guide: "mosques",
  },
];
