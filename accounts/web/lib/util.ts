// Small helpers.

/** Only same-site relative paths are allowed as post-sign-in destinations. */
export function safeNext(v: string | null | undefined, fallback = "/account"): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.length > 500) return fallback;
  return v;
}

/**
 * Display names for the platforms portal/api can sign someone in with, for labelling rows without
 * a round-trip. GET /login/providers is the source of truth for anything that can change.
 */
export const PROVIDER_NAMES: Record<string, string> = {
  github: "GitHub", gitlab: "GitLab", codeberg: "Codeberg", huggingface: "Hugging Face",
  orcid: "ORCID", wikimedia: "Wikimedia", crowdin: "Crowdin", dev: "Development account",
};
export const providerName = (id: string) => PROVIDER_NAMES[id] ?? id;

export const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
