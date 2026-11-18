// Registers the "docs" space with the CMS on boot, retrying with backoff. The space has no content
// collections: it exists so staff can be given access to the docs editor, and so the CMS links to it.
// Failure is never fatal; only staff sign-in waits on it.
import type { CmsClient } from "./cms.js";
import type { Config } from "./config.js";
import { HOUSE } from "./content/house.js";

const BACKOFF_MS = [2_000, 5_000, 15_000, 60_000, 300_000];

export const spacePayload = (config: Config) => ({
  label: HOUSE.label,
  title: HOUSE.title,
  collections: [],
  forms: {},
  links: [
    { label: "Edit the docs", href: `${config.web.url}/admin`, description: "Pages are Markdown in bytheitc/docs; every save is a commit." },
    { label: "Read the docs", href: config.web.url },
  ],
  webhook: null,
});

export function registerWithRetry(config: Config, cms: CmsClient): void {
  if (!config.registerSchema) return;
  if (!cms.configured) {
    console.warn(`[api] no CMS_SPACE_KEY: not registering the "${config.space}" space; staff can't sign in.`);
    return;
  }
  let attempt = 0;
  const tick = async () => {
    try {
      const { changed } = await cms.registerSpace(spacePayload(config));
      console.log(`[api] registered space "${config.space}" with the CMS (${changed ? "updated" : "unchanged"}).`);
    } catch (e) {
      const wait = BACKOFF_MS[Math.min(attempt++, BACKOFF_MS.length - 1)];
      console.error(`[api] registering the space failed (${(e as Error).message}); retrying in ${wait / 1000}s.`);
      setTimeout(() => void tick(), wait).unref();
    }
  };
  void tick();
}
