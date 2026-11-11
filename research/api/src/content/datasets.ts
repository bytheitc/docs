// Placeholder datasheets. Values that are not yet known are null and render as "pending".
import type { Group } from "./publications.js";

export type DatasetStatus = "Released" | "In preparation" | "Not released";

/** null means the value is not yet known; it renders as "pending". */
export type Field = string | null;

export interface DatasheetSection {
  key: string;
  title: string;
  /** Question-and-answer pairs, in the order a datasheet asks them. */
  items: { q: string; a: Field }[];
}

export interface Dataset {
  slug: string;
  title: string;
  group: Group;
  status: DatasetStatus;
  version: Field;
  licence: Field;
  /** Publication id that describes or uses the dataset. */
  pubId?: string;
  summary: string;
  sections: DatasheetSection[];
}

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_DATASETS: Dataset[] = [
  {
    slug: "classical-arabic-english-parallel",
    title: "Classical Arabic–English parallel corpus",
    group: "Language & Text",
    status: "In preparation",
    version: "0.1 (draft)",
    licence: null,
    pubId: "itc-r-003",
    summary: "Passage-aligned classical Arabic prose and English renderings, with editorial notes wherever the alignment is interpretive.",
    sections: [
      { key: "motivation", title: "Motivation", items: [
        { q: "For what purpose was the dataset created?", a: "To support the evaluation and study of translation between classical Arabic and English, with the translator's judgement recorded rather than erased." },
        { q: "Who created it, and on whose behalf?", a: "The Language & Text Group of ITC Research, with editorial review from ITC Institute." },
        { q: "Who funded its creation?", a: null },
      ]},
      { key: "composition", title: "Composition", items: [
        { q: "What do the instances represent?", a: "Each instance is an aligned pair: a passage of classical Arabic prose and an English rendering, with an optional editorial note." },
        { q: "How many instances are there?", a: null },
        { q: "Does the dataset contain information about identifiable living people?", a: "No. Sources are historical texts and published translations." },
        { q: "Are there known gaps or biases?", a: "Coverage follows what is available in the public domain or under open terms, which over-represents some genres and periods. A full account is pending." },
      ]},
      { key: "collection", title: "Collection process", items: [
        { q: "How was the data acquired?", a: "From public-domain printed editions and from translations contributed under open terms by their rights holders." },
        { q: "Who was involved in alignment?", a: "Research staff and editorial affiliates. Compensation terms for contributors are pending." },
        { q: "Over what timeframe?", a: null },
      ]},
      { key: "consent", title: "Consent", items: [
        { q: "Were rights holders asked for permission?", a: "Yes, for every contributed translation. Written permission is held by the data steward." },
        { q: "Can a contributor withdraw their translation?", a: "Yes. Withdrawn material is removed from the next release and noted in the changelog." },
      ]},
      { key: "preprocessing", title: "Preprocessing", items: [
        { q: "What cleaning or normalisation was applied?", a: "Orthographic normalisation of the Arabic is offered as a separate layer; the original orthography is always retained." },
        { q: "Is the raw data available?", a: "Edition references (edition, volume, page) are kept for every passage so the source can be consulted." },
      ]},
      { key: "uses", title: "Uses", items: [
        { q: "What tasks is it suited to?", a: "Evaluation of translation and alignment systems; study of translation practice." },
        { q: "What should it not be used for?", a: "Training a system that presents its translations as authoritative, or as a substitute for a qualified translator of religious texts." },
      ]},
      { key: "distribution", title: "Distribution & licence", items: [
        { q: "How will it be distributed?", a: "Through ITC Open Source, with this datasheet attached to every release." },
        { q: "Under what licence?", a: null },
      ]},
      { key: "maintenance", title: "Maintenance", items: [
        { q: "Who maintains it?", a: "The Language & Text Group. Contact: data@example.org." },
        { q: "How are errors reported and corrected?", a: "By email or issue on ITC Open Source. Corrections are versioned and listed in a public changelog." },
        { q: "Release schedule", a: null },
      ]},
    ],
  },
  {
    slug: "deferral-question-set",
    title: "Deferral question set",
    group: "Trust & Evaluation",
    status: "In preparation",
    version: null,
    licence: null,
    pubId: "itc-r-001",
    summary: "Questions annotated with what a careful answer contains, and the point at which a person should be referred to a qualified scholar.",
    sections: [
      { key: "motivation", title: "Motivation", items: [
        { q: "For what purpose was the dataset created?", a: "To test whether question-answering systems distinguish settled questions from those that need a qualified person, and say so." },
        { q: "Who created it?", a: "The Trust & Evaluation Group, with annotation review from ITC Institute." },
        { q: "Who funded its creation?", a: null },
      ]},
      { key: "composition", title: "Composition", items: [
        { q: "What do the instances represent?", a: "A question, an annotation of established points, points of legitimate difference, and a deferral judgement." },
        { q: "How many instances are there?", a: null },
        { q: "Does it contain personal information?", a: "No. Questions are written or paraphrased by annotators; none are taken from identifiable individuals." },
      ]},
      { key: "collection", title: "Collection process", items: [
        { q: "How were questions written?", a: "Drafted by annotators from common categories of enquiry, then reviewed for clarity and for whether a deferral judgement is defensible." },
        { q: "How were annotators recruited and compensated?", a: null },
      ]},
      { key: "consent", title: "Consent", items: [
        { q: "Were people whose questions appear asked for consent?", a: "Not applicable: no real enquiries are included. Annotators consented to the release of their annotations." },
      ]},
      { key: "preprocessing", title: "Preprocessing", items: [
        { q: "What processing was applied?", a: "Annotations are adjudicated where reviewers disagree; the disagreement is recorded, not discarded." },
      ]},
      { key: "uses", title: "Uses", items: [
        { q: "What tasks is it suited to?", a: "Evaluation of deferral and calibration in question answering." },
        { q: "What should it not be used for?", a: "Training a system to give religious rulings; as a source of rulings in its own right." },
      ]},
      { key: "distribution", title: "Distribution & licence", items: [
        { q: "How will it be distributed?", a: "A public development portion and a held-out portion, to limit its use as a training target. Access arrangements for the held-out portion are pending." },
        { q: "Under what licence?", a: null },
      ]},
      { key: "maintenance", title: "Maintenance", items: [
        { q: "Who maintains it?", a: "The Trust & Evaluation Group. Contact: data@example.org." },
        { q: "Release schedule", a: null },
      ]},
    ],
  },
  {
    slug: "dialect-speech-eval",
    title: "Arabic dialect speech evaluation set",
    group: "Trust & Evaluation",
    status: "In preparation",
    version: null,
    licence: null,
    pubId: "itc-r-006",
    summary: "Read and spontaneous speech balanced across regional dialects, recorded with informed consent, for measuring recognition disparities.",
    sections: [
      { key: "motivation", title: "Motivation", items: [
        { q: "For what purpose was the dataset created?", a: "To measure differences in speech-recognition quality across Arabic dialects under comparable conditions." },
        { q: "Who funded its creation?", a: null },
      ]},
      { key: "composition", title: "Composition", items: [
        { q: "What do the instances represent?", a: "Audio recordings with verified transcripts and self-reported dialect labels." },
        { q: "How many speakers and hours?", a: null },
        { q: "Does it contain personal information?", a: "Yes: voices are personal data. Only self-reported dialect region and broad age band are kept; no names or contact details are stored with the audio." },
      ]},
      { key: "collection", title: "Collection process", items: [
        { q: "How were participants recruited?", a: null },
        { q: "Were participants compensated?", a: "Yes. Rates are pending ethics-panel approval." },
      ]},
      { key: "consent", title: "Consent", items: [
        { q: "How was consent obtained?", a: "In writing, in the participant's preferred language, with separate choices for evaluation use, public release and retention period." },
        { q: "Can participants withdraw?", a: "Yes, at any time. Recordings are deleted from all future releases; withdrawal is not reversible by us." },
        { q: "Will all recordings be public?", a: "No. Only recordings whose speakers opted in to public release will be published. Others are available for evaluation under an access agreement, or not at all." },
      ]},
      { key: "preprocessing", title: "Preprocessing", items: [
        { q: "What processing was applied?", a: "Transcripts are verified by a second speaker of the same dialect. Any accidental identifying content is removed before release." },
      ]},
      { key: "uses", title: "Uses", items: [
        { q: "What tasks is it suited to?", a: "Evaluation of speech recognition across dialects." },
        { q: "What should it not be used for?", a: "Speaker identification, voice cloning, or inferring anything about individuals." },
      ]},
      { key: "distribution", title: "Distribution & licence", items: [
        { q: "How will it be distributed?", a: "Public portion through ITC Open Source; restricted portion through the data steward under an access agreement." },
        { q: "Under what licence?", a: null },
      ]},
      { key: "maintenance", title: "Maintenance", items: [
        { q: "Who maintains it?", a: "The Trust & Evaluation Group and the data steward. Contact: data@example.org." },
        { q: "Retention period", a: null },
      ]},
    ],
  },
  {
    slug: "community-adoption-interviews",
    title: "Community adoption study: instrument and codebook",
    group: "Society & Policy",
    status: "Not released",
    version: null,
    licence: null,
    pubId: "itc-r-004",
    summary: "The interview guide, survey instrument and codebook from the adoption study. Transcripts are withheld to protect participants.",
    sections: [
      { key: "motivation", title: "Motivation", items: [
        { q: "For what purpose was the dataset created?", a: "To understand how community organizations take up and abandon digital tools." },
        { q: "Who funded its creation?", a: null },
      ]},
      { key: "composition", title: "Composition", items: [
        { q: "What is released?", a: "The interview guide, the survey instrument and the codebook used for analysis." },
        { q: "What is withheld?", a: "Interview transcripts and free-text survey responses. Small communities make re-identification too likely, even after redaction." },
      ]},
      { key: "collection", title: "Collection process", items: [
        { q: "How were participants recruited?", a: "Through community partners, with no obligation on any organization to take part." },
        { q: "Timeframe", a: null },
      ]},
      { key: "consent", title: "Consent", items: [
        { q: "What did participants agree to?", a: "Use of their accounts for analysis and quotation without attribution. They did not agree to public release of transcripts, so none will be released." },
        { q: "Can participants withdraw?", a: "Yes. Withdrawn accounts are removed from analysis and from any later publication." },
      ]},
      { key: "preprocessing", title: "Preprocessing", items: [
        { q: "How were transcripts handled?", a: "Stored encrypted, accessed only by the coding team, and scheduled for deletion. Deletion date pending ethics-panel confirmation." },
      ]},
      { key: "uses", title: "Uses", items: [
        { q: "What can the released materials be used for?", a: "Replicating the study elsewhere, or comparing findings across settings." },
      ]},
      { key: "distribution", title: "Distribution & licence", items: [
        { q: "How will instrument and codebook be distributed?", a: "Through ITC Open Source alongside the report." },
        { q: "Under what licence?", a: null },
      ]},
      { key: "maintenance", title: "Maintenance", items: [
        { q: "Who maintains it?", a: "The Society & Policy Group. Contact: data@example.org." },
      ]},
    ],
  },
];

