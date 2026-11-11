import type { PrincipleId } from "@/lib/charter";

// Seed content: editors manage the live version in the admin (collections "benchmarks" and "results").
// Published benchmarks. ALL RESULTS ARE PLACEHOLDERS: no numbers have been measured or published yet.
// Never fill a cell with a number until it comes from a reproducible run linked from ITC Research.

export const EVAL_STATUSES = ["draft", "community review", "scoping"] as const;
export type EvalStatus = (typeof EVAL_STATUSES)[number];

export interface Benchmark {
  id: string;
  name: string;
  question: string;
  principle: PrincipleId;
  status: EvalStatus;
  /** Project slug that maintains the benchmark. */
  project: string;
  metrics: Metric[];
  /** Link to the published, reproducible run behind the metric results. Results are shown only when this is set. */
  run?: string;
}

export interface Metric {
  name: string;
  meaning: string;
  better: "higher" | "lower";
  /** Measured result. Shown only when the benchmark links a reproducible run; otherwise "pending". */
  result?: string;
}

export const SEED_BENCHMARKS: Benchmark[] = [
  {
    id: "honest-uncertainty",
    name: "Honest uncertainty",
    question: "Does the system defer, hedge or refer when it should, and answer when it can?",
    principle: "sidq",
    status: "community review",
    project: "honest-uncertainty",
    metrics: [
      { name: "appropriate deferral", meaning: "Share of items where the expected response was a referral or abstention, and the system gave one.", better: "higher" },
      { name: "fabrication", meaning: "Share of responses containing an invented source, quotation or scholarly position.", better: "lower" },
      { name: "over-refusal", meaning: "Share of answerable items the system declined without good reason.", better: "lower" },
    ],
  },
  {
    id: "citation-fidelity",
    name: "Citation fidelity",
    question: "Does every citation resolve to a real passage that supports the claim?",
    principle: "sidq",
    status: "draft",
    project: "isnad-rag",
    metrics: [
      { name: "resolvable citations", meaning: "Share of citations that point to an existing edition, volume and page.", better: "higher" },
      { name: "supporting citations", meaning: "Share of resolvable citations whose passage actually supports the claim.", better: "higher" },
      { name: "exact quotation", meaning: "Share of quoted spans that match the source text character for character.", better: "higher" },
    ],
  },
  {
    id: "lahja-bench",
    name: "lahja-bench",
    question: "Is quality consistent across Arabic dialects and classical Arabic?",
    principle: "adl",
    status: "scoping",
    project: "lahja-bench",
    metrics: [
      { name: "per-dialect quality", meaning: "Rubric score reported separately for each dialect group.", better: "higher" },
      { name: "worst-group gap", meaning: "Difference between the best- and worst-served groups.", better: "lower" },
    ],
  },
  {
    id: "amanah-probe",
    name: "Amānah probe",
    question: "Does the system leak or retain information it was trusted with?",
    principle: "amanah",
    status: "draft",
    project: "itc-assistant",
    metrics: [
      { name: "memorisation probes", meaning: "Rate at which planted test strings can be extracted after training.", better: "lower" },
      { name: "retention check", meaning: "Whether deleted conversation data is absent from logs and caches after the stated window.", better: "higher" },
    ],
  },
];

/** How a results-table cell is filled. */
export const CELL_STATES = ["pending", "not applicable", "result"] as const;
export type CellState = (typeof CELL_STATES)[number];

export interface EvalCell {
  /** Benchmark id. */
  benchmark: string;
  state: CellState;
  /** The measured value, only for state "result". */
  value?: string;
  /** Link to the published, reproducible run, required before a value is shown. */
  run?: string;
}

export interface EvalRow {
  /** Row id (slug), used by the admin. */
  id: string;
  system: string;
  note: string;
  cells: EvalCell[];
}

/** What a cell shows. A value appears only when it has both a value and a linked run; anything else reads "pending" or "—". */
export function cellDisplay(row: EvalRow, benchmarkId: string): { kind: "pending" | "na" | "result"; text: string; run?: string } {
  const c = row.cells.find((x) => x.benchmark === benchmarkId);
  if (!c || c.state === "pending") return { kind: "pending", text: "pending" };
  if (c.state === "not applicable") return { kind: "na", text: "—" };
  if (c.value && c.run) return { kind: "result", text: c.value, run: c.run };
  return { kind: "pending", text: "pending" };
}

// Placeholder cells: "pending" = run planned, "not applicable" (shown as —) = benchmark does not apply.
const row = (id: string, system: string, note: string, cells: Record<string, CellState>): EvalRow => ({
  id, system, note, cells: Object.entries(cells).map(([benchmark, state]) => ({ benchmark, state })),
});

export const SEED_RESULTS: EvalRow[] = [
  row("itc-assistant-small", "itc-assistant-small", "in development",
    { "honest-uncertainty": "pending", "citation-fidelity": "not applicable", "lahja-bench": "pending", "amanah-probe": "pending" }),
  row("itc-assistant-isnad-rag", "itc-assistant + isnad-rag", "retrieval pipeline",
    { "honest-uncertainty": "pending", "citation-fidelity": "pending", "lahja-bench": "pending", "amanah-probe": "not applicable" }),
  row("baseline-a", "Reference baseline A", "general-purpose model, named on publication",
    { "honest-uncertainty": "pending", "citation-fidelity": "not applicable", "lahja-bench": "pending", "amanah-probe": "not applicable" }),
  row("baseline-b", "Reference baseline B", "general-purpose model + generic RAG, named on publication",
    { "honest-uncertainty": "pending", "citation-fidelity": "pending", "lahja-bench": "pending", "amanah-probe": "not applicable" }),
];
