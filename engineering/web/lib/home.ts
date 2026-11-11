// Content for the title sheet (home page) that is not drawn from other collections.

export interface StackGroup { group: string; items: string[] }
export interface PracticeSummary { section: string; summary: string }

export interface HomeSheet {
  id: string;
  /** One-line summaries for the practices chapter's sections, keyed by section id. */
  practices: PracticeSummary[];
  stack: StackGroup[];
}
