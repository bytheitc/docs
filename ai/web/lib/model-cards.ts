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
