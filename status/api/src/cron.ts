// Scheduled work, triggered from outside. On a serverless host (Vercel) nothing keeps a process
// alive between requests, so the in-process timers this api uses on a long-running server never
// fire there. Vercel Cron calls these routes instead, on the schedules in vercel.json.
//
//   GET /cron/:job    Authorization: Bearer <CRON_SECRET>
//
// Vercel sends that header itself when CRON_SECRET is set on the project. With no secret
// configured the routes don't exist (404): a job endpoint anyone can call is a denial-of-service
// lever, so "unset" means "off", never "open". The same routes work from any other scheduler
// (a GitHub Actions schedule, a system cron with curl) on a long-running host.
import { timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response } from "express";

export type CronJobs = Record<string, () => Promise<unknown>>;

function authorized(req: Request, secret: string): boolean {
  const got = Buffer.from(req.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export function cronRoutes(jobs: CronJobs, secret: string | undefined = process.env.CRON_SECRET): Router {
  const r = Router();
  if (!secret) return r;
  r.get("/cron/:job", async (req: Request, res: Response) => {
    if (!authorized(req, secret)) return res.status(401).json({ ok: false, error: "unauthorized" });
    const run = Object.hasOwn(jobs, req.params.job as string) ? jobs[req.params.job as string] : undefined;
    if (!run) return res.status(404).json({ ok: false, error: "unknown_job", jobs: Object.keys(jobs) });
    const started = Date.now();
    try {
      const result = await run();
      res.json({ ok: true, job: req.params.job, ms: Date.now() - started, result: result ?? null });
    } catch (e) {
      console.error(`[cron] ${req.params.job} failed: ${(e as Error).message}`);
      res.status(500).json({ ok: false, job: req.params.job, error: (e as Error).message });
    }
  });
  return r;
}

/** True on a serverless host, where in-process timers are unreliable and cron routes take over. */
export const serverless = (env: Record<string, string | undefined> = process.env): boolean =>
  env.VERCEL === "1" || Boolean(env.AWS_LAMBDA_FUNCTION_NAME);
