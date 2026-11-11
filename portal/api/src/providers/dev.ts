// Development-only provider: signs in a fake account without OAuth so the flows can be tested locally.
// It is registered only when NODE_ENV !== "production" (see index.ts), and the auth routes refuse it in production too.
import { ProviderError, type ProviderAdapter } from "./types.js";

export const DEV_USERNAME = /^[a-z0-9][a-z0-9-]{1,30}$/;

export const dev: ProviderAdapter = {
  id: "dev",
  name: "Development account",
  category: "dev",
  blurb: "Signs in a fake account without OAuth. Only exists in development.",
  envVars: [],
  setup: ["Available automatically when NODE_ENV is not production. It cannot be enabled in production."],
  tested: "End-to-end tested in development.",
  oauth: () => null,
  async profile(token) {
    const name = String(token.dev_user ?? "");
    if (!DEV_USERNAME.test(name)) throw new ProviderError("Invalid development username.");
    return { providerUserId: `dev-${name}`, username: name, displayName: name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
  },
};
