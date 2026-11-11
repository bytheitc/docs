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

// The portal's public origin lives in Config.web.url: it belongs to portal/web, and the api is told
// about it rather than guessing from a request.

/** Only same-site relative paths are allowed as post-sign-in destinations. */
export function safeNext(v: string | null | undefined, fallback = "/dashboard"): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.length > 500) return fallback;
  return v;
}

/**
 * Display names for the platforms, for labelling rows without a round-trip. The registry itself —
 * which platforms exist, which are configured and how to talk to them — lives in portal/api; this is
 * only what a label says. GET /auth/providers is the source of truth for anything that can change.
 */
export const PROVIDER_NAMES: Record<string, string> = {
  github: "GitHub", gitlab: "GitLab", codeberg: "Codeberg", huggingface: "Hugging Face",
  orcid: "ORCID", wikimedia: "Wikimedia", crowdin: "Crowdin", dev: "Development account",
};
export const providerName = (id: string) => PROVIDER_NAMES[id] ?? id;

/**
 * A page in this space inside the Studio (cms/web), where the portal's content is edited.
 * Set NEXT_PUBLIC_CMS_WEB_URL in production.
 */
export const cmsSpaceUrl = (path = "") =>
  `${(process.env.NEXT_PUBLIC_CMS_WEB_URL ?? "http://localhost:3100").replace(/\/+$/, "")}/spaces/portal${path ? `/${path}` : ""}`;
