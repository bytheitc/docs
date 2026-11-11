// Placeholder publication index. Replace with the real catalogue.
export type PubType = "Paper" | "Working note" | "Dataset" | "Report";
export type Group = "Language & Text" | "Trust & Evaluation" | "Society & Policy" | "Systems";

export const PUB_TYPES: PubType[] = ["Paper", "Working note", "Dataset", "Report"];
export const GROUP_NAMES: Group[] = ["Language & Text", "Trust & Evaluation", "Society & Policy", "Systems"];

export interface Publication {
  id: string;
  title: string;
  type: PubType;
  group: Group;
  year: number;
  summary: string;
  tags: string[];
  /** Abstract, one string per paragraph. */
  abstract: string[];
  keywords: string[];
  /** Houses this work was done with, if any (display names). */
  with?: string[];
  /** Placeholder repository name on ITC Open Source, when code or data accompany the work. */
  repo?: string;
  /** Slug of the datasheet in lib/datasets.ts, when the publication is or releases a dataset. */
  dataset?: string;
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_PUBLICATIONS: Publication[] = [
  {
    id: "itc-r-001",
    title: "Measuring honest uncertainty in religious question answering",
    type: "Paper", group: "Trust & Evaluation", year: 2026,
    summary: "A benchmark and protocol for checking whether language models defer appropriately on questions that need a qualified scholar.",
    tags: ["evaluation", "LLMs"],
    abstract: [
      "Some questions put to a language model have a settled answer; others turn on circumstances, school of thought or the judgement of a qualified person. A system that answers both kinds with the same confidence is not neutral: it is wrong about what it knows. We describe a protocol for testing whether a model distinguishes the two, and whether it says so plainly when it should defer.",
      "The protocol pairs each question with an annotation of what a careful answer would contain: the established facts, the points of legitimate difference, and the point at which a person should be referred onward. We score responses against that annotation rather than against a single gold answer, and we report deferral separately from accuracy so that one cannot be traded silently for the other.",
    ],
    keywords: ["calibration", "deferral", "evaluation protocol", "question answering", "religious knowledge"],
    with: ["AI"],
    repo: "itc-research/deferral-eval",
    dataset: "deferral-question-set",
  },
  {
    id: "itc-r-002",
    title: "Isnad-style provenance for retrieval-augmented generation",
    type: "Paper", group: "Language & Text", year: 2026,
    summary: "Borrowing the hadith sciences' chain-of-transmission model to make generated citations traceable and auditable.",
    tags: ["RAG", "provenance"],
    abstract: [
      "Language models that cite sources often cite them wrongly, and the reader has no easy way to check. The classical hadith sciences faced the same problem and solved it with the isnād, a chain of transmission that names every link between a report and its origin. We propose an analogous structure for retrieval-augmented generation, so that every claim carries a chain back to a primary source.",
      "Each link in the chain records what was transmitted, by which component, and from which edition, volume and page. A chain can then be inspected in the way a reader of the classical literature inspects a chain of narrators: link by link, asking whether each connection is attested. We set out the data model, the failure modes it is meant to expose, and the cases in which it cannot help.",
    ],
    keywords: ["retrieval-augmented generation", "provenance", "citation", "isnād", "auditability"],
    with: ["AI", "Institute"],
    repo: "itc-research/isnad-chain",
  },
  {
    id: "itc-r-003",
    title: "A parallel corpus of classical Arabic and English",
    type: "Dataset", group: "Language & Text", year: 2026,
    summary: "Aligned passages with editorial notes, released under an open license with a datasheet.",
    tags: ["Arabic", "corpus"],
    abstract: [
      "We describe a sentence- and passage-aligned corpus of classical Arabic prose with English renderings, assembled from public-domain editions and translations contributed under open terms. Each alignment carries an editorial note where the correspondence is loose, interpretive or disputed, so that the corpus records the translator's judgement rather than hiding it.",
      "The release is accompanied by a datasheet covering provenance, alignment procedure, known gaps and intended uses. It is meant for evaluation and study, and we discuss why it should not be used on its own to train systems that present translations as authoritative.",
    ],
    keywords: ["classical Arabic", "parallel corpus", "alignment", "translation", "datasheet"],
    with: ["Institute"],
    repo: "itc-research/classical-parallel",
    dataset: "classical-arabic-english-parallel",
  },
  {
    id: "itc-r-004",
    title: "How community organizations adopt digital tools",
    type: "Report", group: "Society & Policy", year: 2026,
    summary: "Interviews and survey work on technology adoption in mosques, schools and nonprofits.",
    tags: ["community", "qualitative"],
    abstract: [
      "Community organizations take up digital tools under constraints that product design rarely accounts for: volunteer turnover, shared devices, mixed literacy, and a justified caution about who holds members' data. This report gathers interviews and survey responses from people who run mosques, weekend schools and small nonprofits, and asks what made a tool stick or fall away.",
      "We describe themes rather than rates. The report sets out the questions asked, how participants were recruited and how their accounts were coded, and it ends with open questions for designers and funders. Interview transcripts are not released; the codebook and instrument are.",
    ],
    keywords: ["technology adoption", "community organizations", "interviews", "qualitative methods"],
    with: ["Institute"],
    dataset: "community-adoption-interviews",
  },
  {
    id: "itc-r-005",
    title: "On-device inference budgets for low-end phones",
    type: "Working note", group: "Systems", year: 2026,
    summary: "Notes on what small models can do within the memory and battery limits of widely used devices.",
    tags: ["efficiency", "privacy"],
    abstract: [
      "Running a model on the phone a person already owns keeps their questions on that phone. The cost is a tight budget of memory, storage, battery and heat. This working note lays out how we intend to measure that budget on inexpensive devices, and which tasks we expect to fit inside it.",
      "The note is a plan and a set of measurement conventions, not a set of results. We publish it now so that the conventions can be criticised before any numbers are produced under them.",
    ],
    keywords: ["on-device inference", "efficiency", "privacy", "measurement", "low-end devices"],
    with: ["Engineering"],
    repo: "itc-research/device-budgets",
  },
  {
    id: "itc-r-006",
    title: "Dialect fairness in Arabic speech recognition",
    type: "Paper", group: "Trust & Evaluation", year: 2025,
    summary: "Error-rate disparities across regional dialects, and what it would take to close them.",
    tags: ["speech", "fairness"],
    abstract: [
      "Speech recognition for Arabic is often built and evaluated on a standard register that few people speak at home. Speakers of regional dialects meet the consequences: transcripts that drop or distort their words, and services that work less well for them than for others. We describe how to measure such disparities fairly, with evaluation sets that are balanced by dialect and recorded with informed consent.",
      "We discuss the confounds that make naive comparisons misleading, including recording conditions, topic and speaker sampling, and we set out what a responsible evaluation set for this purpose needs to contain before conclusions are drawn from it.",
    ],
    keywords: ["speech recognition", "Arabic dialects", "fairness", "evaluation design", "consent"],
    with: ["AI"],
    repo: "itc-research/dialect-eval",
    dataset: "dialect-speech-eval",
  },
  {
    id: "itc-r-007",
    title: "Consent as amānah: a design framework",
    type: "Working note", group: "Society & Policy", year: 2025,
    summary: "Treating user data as a trust held on someone's behalf, and the interface patterns that follow.",
    tags: ["privacy", "design"],
    abstract: [
      "An amānah is something held in trust for another, to be returned intact and used only as its owner would permit. We ask what follows for software if personal data is treated this way rather than as an asset of the service that collects it.",
      "The note proposes a small set of interface and data-handling patterns: consent that is specific and revocable, defaults that hold the least, and an accounting the person can read. It is offered as a framework for discussion, with worked examples drawn from community tools.",
    ],
    keywords: ["consent", "amānah", "privacy by design", "interface patterns", "data stewardship"],
    with: ["Institute"],
  },
  {
    id: "itc-r-008",
    title: "Prayer-time computation at high latitudes",
    type: "Report", group: "Systems", year: 2025,
    summary: "A survey of calculation conventions and their behaviour where twilight never fully ends.",
    tags: ["astronomy", "software"],
    abstract: [
      "Prayer times are defined by the position of the sun, and at high latitudes in summer some of those positions are never reached. Communities and scholars have adopted several conventions for these cases. Software implements them inconsistently, sometimes silently.",
      "This report surveys the conventions in use, describes how each behaves as latitude increases, and recommends that software name the convention it applies and let the user choose. It does not argue for one convention over another; that is a question for scholars and communities, not for a calculation library.",
    ],
    keywords: ["prayer times", "high latitudes", "astronomical computation", "software conventions"],
    with: ["Engineering"],
    repo: "itc-research/high-latitude-times",
  },
];

export const groupSlug = (g: Group) => g.toLowerCase().replace(/&/g, "and").replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

/** Same group or shared tags/keywords, best matches first. */
export function relatedPublications(p: Publication, all: Publication[], limit = 3): Publication[] {
  return all.filter((q) => q.id !== p.id)
    .map((q) => {
      let score = q.group === p.group ? 2 : 0;
      score += q.tags.filter((t) => p.tags.includes(t)).length;
      score += q.keywords.filter((k) => p.keywords.includes(k)).length;
      return { q, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.q.year - a.q.year)
    .slice(0, limit)
    .map((x) => x.q);
}

export function citation(p: Publication): string {
  return `ITC Research, ${p.group} Group (${p.year}). ${p.title}. ITC Research ${p.type}, ${p.id}.`;
}

export function bibtex(p: Publication): string {
  const key = p.id.replace(/-/g, "");
  const kind = p.type === "Dataset" ? "misc" : p.type === "Paper" ? "article" : "techreport";
  return `@${kind}{${key},\n  title  = {${p.title}},\n  author = {{ITC Research, ${p.group} Group}},\n  year   = {${p.year}},\n  note   = {${p.type}, ${p.id}}\n}`;
}
