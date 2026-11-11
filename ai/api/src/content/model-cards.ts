// Model cards: one transparency document per model, always in the same shape.
// Seed content: editors manage the live version in the admin (collection "model-cards").
// Values marked PENDING are deliberately unfilled. They are completed from real runs at release.

export const PENDING = "pending" as const;

export interface CardField {
  label: string;
  value: string;
}

export interface ModelCard {
  slug: string;
  name: string;
  kind: string;
  project: string;
  summary: string;
  facts: CardField[];
  intendedUse: string[];
  outOfScope: string[];
  data: CardField[];
  evaluation: { benchmark: string; result: string }[];
  limitations: string[];
  contact: string;
}

export const SEED_MODEL_CARDS: ModelCard[] = [
  {
    slug: "itc-assistant-small",
    name: "itc-assistant-small",
    kind: "instruction-tuned language model",
    project: "itc-assistant",
    summary: "A compact on-device assistant for finding and reading sources, tuned to state its limits and refer religious rulings to qualified scholars.",
    facts: [
      { label: "version", value: "0.x (pre-release)" },
      { label: "status", value: "in development" },
      { label: "parameters", value: PENDING },
      { label: "licence", value: PENDING },
      { label: "runs on", value: "local-first runtime" },
      { label: "card updated", value: PENDING },
    ],
    intendedUse: [
      "Helping people locate and read passages in texts they already have access to.",
      "Explaining terms, summarising a passage and showing where it came from.",
      "Presenting the range of established scholarly positions on a question, with sources, and noting where they differ.",
    ],
    outOfScope: [
      "Issuing fatwas or personal religious rulings. The model is tuned to refer these to a scholar the person trusts.",
      "Medical, legal, financial or mental-health advice.",
      "Any use where the model's output is presented as the words of a scholar, imam or teacher.",
      "Surveillance, profiling or inferring a person's religious practice.",
    ],
    data: [
      { label: "pre-training", value: "Inherited from an openly licensed base model (to be named in the release)." },
      { label: "fine-tuning", value: "Instruction data written for this project; no user conversations." },
      { label: "religious content", value: "Drafted and reviewed with scholars advising the collective." },
      { label: "datasheet", value: PENDING },
    ],
    evaluation: [
      { benchmark: "honest-uncertainty", result: PENDING },
      { benchmark: "lahja-bench", result: PENDING },
      { benchmark: "amanah-probe", result: PENDING },
    ],
    limitations: [
      "Small models know less. It will miss things a larger model would find, and it is tuned to say so rather than guess.",
      "Dialect coverage is uneven until lahja-bench results are in. Expect weaker answers outside Modern Standard Arabic and English.",
      "It can still be wrong while sounding sure. Check every source it shows you.",
    ],
    contact: "ai-models@example.org",
  },
  {
    slug: "isnad-embed",
    name: "isnad-embed",
    kind: "text embedding model",
    project: "isnad-rag",
    summary: "An embedding model for retrieving passages from classical and modern Arabic texts, used inside the isnad-rag pipeline.",
    facts: [
      { label: "version", value: "0.x (pre-release)" },
      { label: "status", value: "in development" },
      { label: "dimensions", value: PENDING },
      { label: "licence", value: PENDING },
      { label: "used by", value: "isnad-rag" },
      { label: "card updated", value: PENDING },
    ],
    intendedUse: [
      "Finding candidate passages for a query so that a reader, or a generation step, can cite them.",
      "Search over collections whose licences permit indexing.",
    ],
    outOfScope: [
      "Judging the authenticity or grading of a report. Retrieval similarity says nothing about reliability.",
      "Ranking or recommending scholars, schools of thought or opinions.",
    ],
    data: [
      { label: "training pairs", value: "Built from the classical Arabic–English corpus and openly licensed text." },
      { label: "personal data", value: "None intended. Sources are screened before inclusion." },
      { label: "datasheet", value: PENDING },
    ],
    evaluation: [
      { benchmark: "citation-fidelity (as part of isnad-rag)", result: PENDING },
      { benchmark: "retrieval quality, classical vs modern", result: PENDING },
    ],
    limitations: [
      "Retrieval quality on classical texts depends heavily on edition and orthography.",
      "Finds similar text, not correct text. A retrieved passage is a starting point for reading, not an answer.",
    ],
    contact: "ai-models@example.org",
  },
  {
    slug: "classical-align",
    name: "classical-align",
    kind: "sentence alignment model",
    project: "classical-corpus",
    summary: "A model that proposes sentence-level alignments between classical Arabic texts and existing English translations, for review by bilingual readers.",
    facts: [
      { label: "version", value: "0.x (exploring)" },
      { label: "status", value: "exploring" },
      { label: "licence", value: PENDING },
      { label: "used by", value: "classical-corpus" },
      { label: "card updated", value: PENDING },
    ],
    intendedUse: [
      "Proposing candidate alignments that a human reviewer accepts, corrects or rejects.",
      "Building research corpora where every pair is later checked.",
    ],
    outOfScope: [
      "Producing translations. It aligns existing human translations; it does not write new ones.",
      "Any unreviewed publication of aligned sacred text.",
    ],
    data: [
      { label: "sources", value: "Only texts and translations whose licences permit this use." },
      { label: "review", value: "Bilingual readers check a sample of every batch." },
      { label: "datasheet", value: PENDING },
    ],
    evaluation: [
      { benchmark: "alignment accuracy (human-reviewed sample)", result: PENDING },
    ],
    limitations: [
      "Translations are often looser than sentence-by-sentence; some passages cannot be aligned cleanly.",
      "Not tested on poetry or heavily annotated editions.",
    ],
    contact: "ai-models@example.org",
  },
];
