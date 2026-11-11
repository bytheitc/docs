// Small portal helpers.
import { HOUSES, type HouseId } from "@/lib/houses";

export const HOUSE_IDS = HOUSES.map((h) => h.id) as HouseId[];
export const isHouse = (v: string): v is HouseId => (HOUSE_IDS as string[]).includes(v);
export const houseName = (id: string) => HOUSES.find((h) => h.id === id)?.name ?? id;

export const KIND_LABEL: Record<string, string> = {
  pr: "Pull request", "merge-request": "Merge request", commit: "Commit", issue: "Issue", review: "Review",
  model: "Model", dataset: "Dataset", space: "Space", work: "Research work", edit: "Wiki edit", translation: "Translation",
  writing: "Writing", design: "Design", teaching: "Teaching", other: "Other",
};
export const kindLabel = (k: string) => KIND_LABEL[k] ?? k;

/** Kinds a contributor may self-log. */
export const SELF_KINDS = ["writing", "design", "teaching", "review", "translation", "other"] as const;

export const HANDLE = /^[a-z0-9][a-z0-9-]{1,29}$/;
export function handleFrom(s: string): string {
  const h = s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
  return h.length >= 2 ? h : `contributor-${h}`.replace(/-$/, "");
}

/** Only http(s) links are ever rendered as hrefs. */
export function httpUrl(v: string): string | null {
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** The public origin, for OAuth redirect URIs. Set PORTAL_URL in production. */
export function origin(reqUrl?: string): string {
  if (process.env.PORTAL_URL) return process.env.PORTAL_URL.replace(/\/+$/, "");
  if (reqUrl) return new URL(reqUrl).origin;
  return "http://localhost:3006";
}
