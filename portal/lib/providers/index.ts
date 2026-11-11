// The provider registry. Add a provider: write lib/providers/<id>.ts exporting a ProviderAdapter, then list it here.
import { codeberg } from "./codeberg";
import { crowdin } from "./crowdin";
import { dev } from "./dev";
import { github } from "./github";
import { gitlab } from "./gitlab";
import { huggingface } from "./huggingface";
import { orcid } from "./orcid";
import type { ProviderAdapter } from "./types";
import { wikimedia } from "./wikimedia";

export const PROVIDERS: ProviderAdapter[] = [github, gitlab, codeberg, huggingface, orcid, wikimedia, crowdin];
export const PROVIDER_IDS = PROVIDERS.map((p) => p.id);

/** The dev provider can never exist in a production build: Next inlines NODE_ENV at build time. */
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
