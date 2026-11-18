// GET /first-hundred: the launch board, passed through from portal/api. The web talks only to this
// api (ARCHITECTURE.md, rule 1), and the portal owns the claims the board is built from (rule 2).
// When the portal can't be reached this answers 503 and the page shows its fallback.
import { Router } from "express";
import type { Ctx } from "../app.js";
import { sendError } from "../http.js";

export function firstHundredRoutes({ config }: Ctx): Router {
  const r = Router();
  r.get("/first-hundred", async (_req, res) => {
    try {
      const up = await fetch(`${config.portal.url}/public/first-hundred`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000), redirect: "manual" });
      if (!up.ok) return sendError(res, 503, "unavailable", `The portal answered HTTP ${up.status}.`);
      res.setHeader("Cache-Control", up.headers.get("cache-control") ?? "no-store");
      res.json(await up.json());
    } catch (e) {
      sendError(res, 503, "unavailable", `The portal could not be reached: ${(e as Error).message}`);
    }
  });
  return r;
}
