// Placeholder working notes. Essays are drafts in the house voice; replace or revise before launch.
import type { Group } from "@/lib/publications";

export interface NoteSection {
  heading?: string;
  paragraphs: string[];
}

export interface Note {
  slug: string;
  title: string;
  dek: string;
  group: Group | "Editorial";
  /** ISO date (YYYY-MM-DD). */
  date: string;
  readingMinutes: number;
  sections: NoteSection[];
  /** Publication ids this note discusses. */
  related?: string[];
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${d} ${months[m - 1]} ${y}`;
}
