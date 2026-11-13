// The houses of the collective, as the portal knows them. This mirrors lib/houses.ts in every
// web app; the shape is trimmed to what a phone needs (no URLs — the app never links out to a
// house, it only has to name one).
import type { HouseId } from "./types";

export interface House {
  id: HouseId;
  name: string;
  arabic: string;
  transliteration: string;
}

export const HOUSES: House[] = [
  { id: "site", name: "Collective", arabic: "جماعة", transliteration: "jamāʿa" },
  { id: "ai", name: "AI", arabic: "ذكاء", transliteration: "dhakāʾ" },
  { id: "engineering", name: "Engineering", arabic: "هندسة", transliteration: "handasa" },
  { id: "health", name: "Health", arabic: "عافية", transliteration: "ʿāfiya" },
  { id: "institute", name: "Institute", arabic: "معهد", transliteration: "maʿhad" },
  { id: "oss", name: "Open Source", arabic: "مشاع", transliteration: "mashāʿ" },
  { id: "research", name: "Research", arabic: "بحث", transliteration: "baḥth" },
];

export const houseName = (id: string): string => HOUSES.find((h) => h.id === id)?.name ?? id;

/** Provider ids the portal can claim issues on, and how to say them. */
export const providerName = (id: string): string =>
  id === "dev" ? "Development account"
  : id === "github" ? "GitHub"
  : id === "gitlab" ? "GitLab"
  : id === "codeberg" ? "Codeberg"
  : id.charAt(0).toUpperCase() + id.slice(1);

/**
 * The kinds of work you may log about yourself. Synced work carries other kinds — "pr", "commit"
 * and so on — but those come from a provider, not from a person typing. This list must stay equal
 * to SELF_KINDS in portal/api/src/portal/util.ts, or the api rejects the form.
 */
export const SELF_KINDS = [
  { id: "writing", label: "Writing" },
  { id: "design", label: "Design" },
  { id: "teaching", label: "Teaching" },
  { id: "review", label: "Review" },
  { id: "translation", label: "Translation" },
  { id: "other", label: "Other" },
] as const;

/** How to say a contribution kind, including the ones only a sync produces. */
export const kindLabel = (id: string): string =>
  ({
    pr: "Pull request",
    "merge-request": "Merge request",
    commit: "Commit",
    issue: "Issue",
    review: "Review",
    model: "Model",
    dataset: "Dataset",
    space: "Space",
    work: "Work",
    edit: "Edit",
    translation: "Translation",
    writing: "Writing",
    design: "Design",
    teaching: "Teaching",
    other: "Other",
  })[id] ?? id;

/** Issues can only be claimed where the portal can see them. Mirrors CLAIMABLE in routes/me.ts. */
export const CLAIMABLE = ["github", "gitlab", "codeberg", "dev"];
