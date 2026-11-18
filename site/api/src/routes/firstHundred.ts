// GET /first-hundred: the launch board. The web talks only to this api (ARCHITECTURE.md, rule 1).
//
// portal/api owns the board, because it knows who has claimed what (rule 2), so it is asked first.
// When the portal can't be reached, the board is built here straight from GitHub instead, with no
// claims shown, so the page never goes blank because one hop is down. Only when GitHub fails too,
// with nothing built before, does this answer 503 and the page show its fallback text.
import { Router } from "express";
import type { Ctx } from "../app.js";
import { sendError } from "../http.js";
import { buildBoardFromIssues, fetchIssues, type Board } from "../firstHundredBoard.js";

// GitHub's search api allows 10 unauthenticated requests a minute from one address, and a serverless
// host shares its addresses. Five minutes between rebuilds keeps well inside that.
const FALLBACK_TTL_MS = 5 * 60_000;

export function firstHundredRoutes({ config }: Pick<Ctx, "config">, fetchImpl: typeof fetch = fetch): Router {
  const r = Router();
  let fallback: { value: Board; at: number } | undefined;
  let building: Promise<Board> | undefined;

  const fromGithub = async (): Promise<Board> => {
    if (fallback && Date.now() - fallback.at < FALLBACK_TTL_MS) return fallback.value;
    building ??= fetchIssues(config.firstHundred.org, config.firstHundred.token, fetchImpl)
      .then((issues) => buildBoardFromIssues(issues))
      .finally(() => { building = undefined; });
    try {
      fallback = { value: await building, at: Date.now() };
      return fallback.value;
    } catch (e) {
      if (fallback) return { ...fallback.value, stale: true };
      throw e;
    }
  };

  r.get("/first-hundred", async (_req, res) => {
    let why: string;
    try {
      const up = await fetchImpl(`${config.portal.url}/public/first-hundred`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000), redirect: "manual" });
      if (up.ok) {
        res.setHeader("Cache-Control", up.headers.get("cache-control") ?? "no-store");
        return void res.json(await up.json());
      }
      why = `the portal answered HTTP ${up.status}`;
    } catch (e) {
      why = `the portal could not be reached (${(e as Error).message})`;
    }

    try {
      const board = await fromGithub();
      console.warn(`[api] first-hundred: ${why}; serving the board built from GitHub.`);
      res.setHeader("Cache-Control", "public, max-age=60");
      res.json(board);
    } catch (e) {
      console.error(`[api] first-hundred: ${why}, and GitHub failed too: ${(e as Error).message}`);
      sendError(res, 503, "unavailable", "The board can't be built right now.");
    }
  });
  return r;
}
