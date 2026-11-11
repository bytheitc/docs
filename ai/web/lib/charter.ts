// The AI house charter: five principles, why we hold them, and how each one is enforced at release.
// Seed content: editors manage the live version in the admin (collection "principles").
// Placeholder wording. Review with the collective's scholars and advisors before launch.

/** A principle's id (slug). The seed uses amanah, sidq, adl, shura and ilm; editors may add more. */
export type PrincipleId = string;

export interface Principle {
  id: PrincipleId;
  /** Transliteration, as used across the site. */
  k: string;
  arabic: string;
  /** Plain-English sense of the word. */
  sense: string;
  title: string;
  summary: string;
  reasoning: string[];
  practice: string[];
  enforcement: { gate: string; detail: string }[];
}

/** Looks up a principle in a list; undefined if it is missing or unpublished. */
export const principleById = (list: Principle[], id: PrincipleId) => list.find((p) => p.id === id);
