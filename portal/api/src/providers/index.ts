// The provider registry. Add a provider: write src/providers/<id>.ts exporting a ProviderAdapter, then list it here.
import { codeberg } from "./codeberg.js";
import { crowdin } from "./crowdin.js";
import { dev } from "./dev.js";
import { github } from "./github.js";
import { gitlab } from "./gitlab.js";
import { huggingface } from "./huggingface.js";
import { orcid } from "./orcid.js";
import type { ProviderAdapter } from "./types.js";
import { wikimedia } from "./wikimedia.js";

export const PROVIDERS: ProviderAdapter[] = [github, gitlab, codeberg, huggingface, orcid, wikimedia, crowdin];
export const PROVIDER_IDS = PROVIDERS.map((p) => p.id);

/** The dev provider is refused in production, so a deployed portal can never sign anyone in with it. */
export const DEV_PROVIDER_ENABLED = process.env.NODE_ENV !== "production";

const env = () => process.env as Record<string, string | undefined>;

export const isConfigured = (p: ProviderAdapter) => (p.id === "dev" ? DEV_PROVIDER_ENABLED : !!p.oauth(env()));

/** Providers people can sign in with right now. */
export function availableProviders(): ProviderAdapter[] {
  const list = PROVIDERS.filter(isConfigured);
  return DEV_PROVIDER_ENABLED ? [...list, dev] : list;
}

/** A provider by id, only if it is usable for sign-in in this environment. */
export function usableProvider(id: string): ProviderAdapter | null {
  return availableProviders().find((p) => p.id === id) ?? null;
}

/** Any known provider by id (for display), including unconfigured ones; dev only outside production. */
export function knownProvider(id: string): ProviderAdapter | null {
  if (id === "dev") return DEV_PROVIDER_ENABLED ? dev : null;
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

export const providerName = (id: string) => (id === "dev" ? "Development account" : PROVIDERS.find((p) => p.id === id)?.name ?? id);
