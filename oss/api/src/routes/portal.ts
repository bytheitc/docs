// Open Source's own endpoint: the contributor portal's public, opt-in wall.
//   GET /portal-wall  →  { contributors: [...] }
// The web asks its own api, and the api asks portal/api, so the portal's address and any future
// credential stay on the server (ARCHITECTURE.md, rules 1 and 3). The portal being down is not an
// error here: the page shows the maintainers' wall alone.
import { Router } from "express";
import type { Ctx } from "../app.js";

const TIMEOUT_MS = 3000;
const TTL_MS = 60_000;

export interface PortalContributor {
  handle: string;
  name: string;
  avatarUrl: string | null;
  profileUrl: string;
  joined: string;
}

export function portalRoutes({ config }: Ctx): Router {
  const r = Router();
  let cache: { at: number; contributors: PortalContributor[] | null } | null = null;

  r.get("/portal-wall", async (_req, res) => {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      let contributors: PortalContributor[] | null = null;
      try {
        const upstream = await fetch(`${config.portalApiUrl}/public/contributors`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          redirect: "manual",
        });
        if (upstream.ok) {
          const body = (await upstream.json()) as { contributors?: PortalContributor[] };
          if (Array.isArray(body.contributors)) contributors = body.contributors;
        } else {
          console.error(`[api] portal wall → HTTP ${upstream.status}`);
        }
      } catch (e) {
        console.error(`[api] portal wall unreachable: ${(e as Error).message}`);
      }
      cache = { at: Date.now(), contributors };
    }
    // null means "we could not ask"; an empty list means "nobody has opted in".
    res.setHeader("X-Portal-Source", cache.contributors ? "portal" : "unavailable");
    res.json({ contributors: cache.contributors });
  });

  return r;
}
