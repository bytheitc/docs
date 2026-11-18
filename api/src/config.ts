// Settings from the environment. Everything this service reads from process.env is read here, once.
//
//   PORT                port to listen on
//   CMS_API_URL         base URL of cms/api (http://localhost:4100 in development)
//   CMS_SPACE_KEY       this house's service key for the CMS, used only to let staff sign in
//   API_PUBLIC_URL      this api's public address
//   WEB_URL             base URL of docs/web, for revalidation and the CMS's link to the editor
//   REVALIDATE_SECRET   shared with the web; sent as x-revalidate-secret after every edit
//   DOCS_SOURCE         github | fs. Where the pages live. Default: github when DOCS_GITHUB_TOKEN is
//                       set, otherwise fs (the content/ folder next to this api, for development)
//   DOCS_GITHUB_REPO    owner/name of the repository holding the pages (bytheitc/docs)
//   DOCS_GITHUB_BRANCH  the branch edits are committed to (main)
//   DOCS_GITHUB_PATH    the folder inside the repository that holds the pages (content)
//   DOCS_GITHUB_TOKEN   a fine-grained token with Contents: read and write on that repository only.
//                       Never leaves this server (ARCHITECTURE.md, rule 3)
//   DOCS_CONTENT_DIR    the folder the fs source reads and writes (../content)
//   CONTENT_TTL         seconds a read of the repository is reused before GitHub is asked again (60)
//   REGISTER_SCHEMA     "off" skips registering the docs space with the CMS on boot (useful in tests)
//   API_LOG             "off" silences request logs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOUSE } from "./content/house.js";

export interface Config {
  production: boolean;
  port: number;
  space: string;
  cms: { url: string; key: string };
  publicUrl: string;
  web: { url: string; revalidateSecret: string };
  source:
    | { kind: "github"; repo: string; branch: string; dir: string; token: string }
    | { kind: "fs"; dir: string; writable: boolean };
  contentTtlMs: number;
  registerSchema: boolean;
  log: boolean;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const trim = (s: string) => s.replace(/\/+$/, "");

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === "production";
  const port = Number(env.PORT) || HOUSE.port;
  const token = env.DOCS_GITHUB_TOKEN || "";
  const kind = (env.DOCS_SOURCE || (token ? "github" : "fs")).toLowerCase();
  return {
    production,
    port,
    space: HOUSE.space,
    cms: {
      url: trim(env.CMS_API_URL || "http://localhost:4100"),
      // In development the CMS accepts "dev-<space>-key" for a space with no key configured.
      key: env.CMS_SPACE_KEY || (production ? "" : `dev-${HOUSE.space}-key`),
    },
    publicUrl: trim(env.API_PUBLIC_URL || `http://localhost:${port}`),
    web: { url: trim(env.WEB_URL || `http://localhost:${HOUSE.webPort}`), revalidateSecret: env.REVALIDATE_SECRET || "" },
    source: kind === "github"
      ? {
        kind: "github",
        repo: env.DOCS_GITHUB_REPO || "bytheitc/docs",
        branch: env.DOCS_GITHUB_BRANCH || "main",
        dir: (env.DOCS_GITHUB_PATH ?? "content").replace(/^\/+|\/+$/g, ""),
        token,
      }
      // Writing to local files is a development convenience. In production, with no token, the docs
      // are read-only rather than edited into a server's disk that the next deploy throws away.
      : { kind: "fs", dir: path.resolve(env.DOCS_CONTENT_DIR || path.join(here, "..", "..", "content")), writable: !production },
    contentTtlMs: (Number(env.CONTENT_TTL) || 60) * 1000,
    registerSchema: env.REGISTER_SCHEMA !== "off",
    log: env.API_LOG !== "off",
  };
}
