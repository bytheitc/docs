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
