// Placeholder research groups. Replace agendas and roles with the real programme before launch.
import type { HouseId } from "@/lib/houses";
import { GROUP_NAMES, groupSlug, type Group } from "@/lib/publications";

export interface Role {
  role: string;
  /** Always "Name to be announced" in this build: no real or invented people. */
  name: string;
  note?: string;
}

export interface ResearchGroup {
  slug: string;
  name: Group;
  focus: string;
  agenda: string[];
  questions: string[];
  collaborators: { house: HouseId; how: string }[];
  roles: Role[];
}

const TBA = "Name to be announced";

const DATA: Omit<ResearchGroup, "slug">[] = [
  {
    name: "Language & Text",
    focus: "Arabic NLP, classical texts, provenance",
    agenda: [
      "The group works on language technology for Arabic and for the classical textual tradition, where a sentence may carry a millennium of commentary and a citation is a claim about transmission. We build corpora, alignment tools and provenance structures that let a reader see where a piece of text came from and how it was handled on the way.",
      "Our standing commitment is to keep editorial judgement visible. Where a translation is interpretive, where an edition differs from a manuscript, or where an alignment is uncertain, the data should say so rather than smoothing it over.",
    ],
    questions: [
      "What would a minimal, inspectable chain of transmission look like for a generated answer, and who should be able to audit it?",
      "How should a corpus record disagreement between translators without forcing a single reading?",
      "Which tasks on classical texts can be evaluated automatically, and which need a qualified reader every time?",
      "How do edition, volume and page references survive digitisation, and where do they break?",
    ],
    collaborators: [
      { house: "ai", how: "Retrieval and citation components for provenance-aware systems." },
      { house: "institute", how: "Scholarly review of corpora, editions and editorial notes." },
      { house: "oss", how: "Release of alignment tools and corpus loaders." },
    ],
    roles: [
      { role: "Group lead", name: TBA },
      { role: "Research fellow, computational philology", name: TBA },
      { role: "Research engineer, corpora", name: TBA },
      { role: "Editorial affiliate", name: TBA, note: "Seconded from ITC Institute" },
    ],
  },
  {
    name: "Trust & Evaluation",
    focus: "Benchmarks, fairness, honest uncertainty",
    agenda: [
      "The group asks whether systems do what is claimed of them, for whom, and with what confidence. We design evaluation protocols, build balanced test sets and report results in a way that keeps accuracy, deferral and disparity separate, so that none of them can be hidden inside an average.",
      "We are particularly concerned with questions that should not be answered by a machine alone, and with the users a system serves least well. An evaluation that does not look for those cases is not finished.",
    ],
    questions: [
      "How do we score a response that rightly declines to answer, without rewarding systems that decline everything?",
      "What is the smallest evaluation set that can support a claim of fairness across dialects, and how should it be sampled?",
      "How should uncertainty be expressed to a non-specialist reader so that it is understood and not ignored?",
      "When a benchmark is published, how do we stop it becoming a training target that no longer measures anything?",
    ],
    collaborators: [
      { house: "ai", how: "Shared evaluation harnesses and pre-release model reviews." },
      { house: "oss", how: "Open evaluation code and result reproducibility." },
    ],
    roles: [
      { role: "Group lead", name: TBA },
      { role: "Research fellow, evaluation methodology", name: TBA },
      { role: "Research fellow, speech and fairness", name: TBA },
      { role: "Doctoral affiliate", name: TBA },
    ],
  },
  {
    name: "Society & Policy",
    focus: "Adoption, privacy, digital rights",
    agenda: [
      "The group studies how technology enters the lives of communities: mosques, weekend schools, families and the small organizations that serve them. We use interviews, surveys and participatory design, and we write for the people who make decisions in those settings as much as for other researchers.",
      "Much of this work involves people's own accounts of their lives. We treat what they share as an amānah, a trust, and design consent, storage and release around that obligation.",
    ],
    questions: [
      "What makes a community organization keep using a tool after the volunteer who introduced it has moved on?",
      "What would meaningful, revocable consent look like in a tool used on a shared family phone?",
      "Which digital-rights questions are specific to religious minorities, and which are shared with everyone?",
      "How can qualitative findings be shared openly when the underlying transcripts cannot be?",
    ],
    collaborators: [
      { house: "institute", how: "Ethics review, community partnerships and policy briefings." },
      { house: "site", how: "Plain-language summaries for members of the Collective." },
    ],
    roles: [
      { role: "Group lead", name: TBA },
      { role: "Research fellow, qualitative methods", name: TBA },
      { role: "Community research associate", name: TBA },
      { role: "Policy affiliate", name: TBA, note: "Seconded from ITC Institute" },
    ],
  },
  {
    name: "Systems",
    focus: "Efficiency, on-device computing, reliability",
    agenda: [
      "The group works on the computing underneath: what can run on an inexpensive phone, how software behaves at the edges of its assumptions, and how to measure both honestly. On-device computation is a privacy measure as much as an efficiency one, because data that never leaves a device cannot be misused elsewhere.",
      "We publish measurement conventions before measurements, and we treat edge cases, from limited memory to high latitudes, as the places where a system's design shows.",
    ],
    questions: [
      "Which useful tasks fit within the memory, battery and thermal limits of the phones people actually own?",
      "How should a calculation library expose a convention it applies, so that users can see and change it?",
      "What does reliable mean for software used at fixed times of day by many people at once?",
      "How do we report performance measurements so they can be reproduced on different hardware?",
    ],
    collaborators: [
      { house: "engineering", how: "Device testing, reliability reviews and production hand-off." },
      { house: "oss", how: "Release of measurement tooling and reference implementations." },
    ],
    roles: [
      { role: "Group lead", name: TBA },
      { role: "Research engineer, on-device inference", name: TBA },
      { role: "Research engineer, measurement", name: TBA },
      { role: "Affiliate", name: TBA, note: "Seconded from ITC Engineering" },
    ],
  },
];

/** Built-in content: seeds the database and serves as the fallback when none is connected. */
export const SEED_GROUPS: ResearchGroup[] = GROUP_NAMES.map((name) => {
  const g = DATA.find((d) => d.name === name)!;
  return { ...g, slug: groupSlug(name) };
});

/** The group record for a group name. Falls back to a minimal record if an editor removed the group. */
export const groupByName = (groups: ResearchGroup[], name: Group): ResearchGroup =>
  groups.find((g) => g.name === name) ?? { slug: groupSlug(name), name, focus: "", agenda: [], questions: [], collaborators: [], roles: [] };

/** Research-wide roles that sit outside any single group. */
export interface Office {
  id: "office";
  roles: Role[];
}

export const SEED_OFFICE: Role[] = [
  { role: "Director of Research", name: TBA },
  { role: "Managing editor", name: TBA, note: "Corrections and errata" },
  { role: "Data steward", name: TBA, note: "Consent, access requests and retention" },
  { role: "Research ethics panel", name: "Membership to be announced", note: "Reviews all work with human participants" },
];
