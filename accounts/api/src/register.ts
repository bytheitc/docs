// Registers this house's schema with the CMS on boot, retrying with backoff.
// Failure is never fatal: the api serves its built-in seed content (the collective's own trusted
// clients) until the CMS answers.
import type { CmsClient } from "./cms.js";
import type { Config } from "./config.js";
import { buildSchema } from "./schema.js";

const BACKOFF_MS = [2_000, 5_000, 15_000, 60_000, 300_000];

export function registerSchemaWithRetry(config: Config, cms: CmsClient): void {
  if (!config.registerSchema) return;
  if (!cms.configured) {
    console.warn(`[api] no CMS_SPACE_KEY: not registering the "${config.space}" schema; serving seed content.`);
    return;
  }

  let attempt = 0;
  const tick = async () => {
    try {
      const { changed, seeded } = await cms.registerSchema(buildSchema(config));
      const what = [changed ? "schema updated" : "schema unchanged", seeded.length ? `seeded ${seeded.join(", ")}` : null].filter(Boolean);
      console.log(`[api] registered space "${config.space}" with the CMS (${what.join("; ")}).`);
    } catch (e) {
      const wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
      attempt++;
      console.error(`[api] registering the schema failed (${(e as Error).message}); retrying in ${wait / 1000}s.`);
      setTimeout(() => void tick(), wait).unref();
    }
  };
  void tick();
}
