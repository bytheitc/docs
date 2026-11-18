// The editor's api. Staff sign in with their CMS account (no second password); every change is a
// commit to the docs repository, authored by the staff member who made it.
//
//   POST   /staff/login                 { email, password } -> { token, expiresAt, user }
//   GET    /staff/me
//   GET    /staff/status                where the docs live and whether they can be edited
//   GET    /staff/pages                 every page, listed or not, with its version (sha)
//   GET    /staff/pages/*slug           one page as stored, with its version
//   POST   /staff/pages                 create { slug, title, description, markdown, section? }
//   PUT    /staff/pages/*slug           save { title, description, markdown, sha, message? }
//   POST   /staff/move                  { from, to, sha }              publisher
//   DELETE /staff/pages/*slug?sha=      delete                         publisher
//   GET    /staff/nav                   the sidebar as stored, with its version
//   PUT    /staff/nav                   { nav, sha }                   publisher
//   GET    /staff/history/*slug         the commits that touched a page
import { Router, type NextFunction, type Request, type Response } from "express";
import type { Ctx } from "../app.js";
import { body, HttpError, rateLimit, str } from "../http.js";
import { atLeast, needsStaff } from "../guard.js";
import { EditError, SLUG, type Nav } from "../pages.js";
import { revalidateWeb } from "../revalidate.js";
import { ConflictError } from "../source.js";
import { slugParam } from "./public.js";

export function staffRoutes({ cms, docs, config }: Ctx): Router {
  const r = Router();
  const staff = needsStaff(cms);
  const author = (req: Request) => ({ name: req.staff!.name || req.staff!.email, email: req.staff!.email });

  // Turns the model's errors into HTTP ones, and tells the web what changed.
  const edit = (fn: (req: Request) => Promise<{ revision: string; slugs: string[] }>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { revision, slugs } = await fn(req);
        revalidateWeb(config, slugs);
        res.json({ ok: true, revision });
      } catch (e) {
        if (e instanceof ConflictError) return next(new HttpError(409, "conflict", e.message));
        if (e instanceof EditError) return next(new HttpError(e.status, e.status === 409 ? "conflict" : e.status === 404 ? "not_found" : e.status === 503 ? "unavailable" : e.fields ? "validation_failed" : "bad_request", e.message, e.fields));
        next(e);
      }
    };

  r.post("/staff/login", rateLimit({ name: "docs-login", max: 10, windowMs: 10 * 60_000, key: (req) => req.ip ?? "?" }), async (req, res) => {
    const b = body(req);
    const result = await cms.login(str(b, "email", { required: true, max: 200 }), str(b, "password", { required: true, max: 200 }));
    if ("error" in result) throw new HttpError(result.status, result.status === 429 ? "rate_limited" : result.status === 503 ? "unavailable" : "unauthorized", result.error);
    const user = await cms.introspect(result.token);
    if (!user) throw new HttpError(403, "forbidden", "That account can't open the docs space. Ask an administrator for access.");
    res.json({ ok: true, token: result.token, expiresAt: result.expiresAt, user });
  });

  r.get("/staff/me", staff, (req, res) => res.json({ user: req.staff }));

  r.get("/staff/status", staff, (_req, res) => {
    res.json({ source: docs.source.kind, where: docs.source.where, writable: docs.source.writable, webUrl: config.web.url });
  });

  r.get("/staff/pages", staff, async (_req, res) => {
    const pages = await docs.all();
    res.json({ pages: pages.map((p) => ({ slug: p.slug, title: p.title, description: p.description, section: p.section, sha: p.sha, words: p.markdown.split(/\s+/).filter(Boolean).length })) });
  });

  r.get("/staff/pages/*slug", staff, async (req, res) => {
    const found = await docs.page(slugParam(req.params.slug));
    if (!found) throw new HttpError(404, "not_found", "No such page.");
    res.json({ page: found.page });
  });

  r.post("/staff/pages", staff, edit(async (req) => {
    const b = body(req);
    const slug = str(b, "slug", { required: true, max: 200 }).replace(/^\/+|\/+$/g, "").toLowerCase();
    const input = { slug, title: str(b, "title", { max: 200 }), description: str(b, "description", { max: 400 }), markdown: rawString(b.markdown), section: str(b, "section", { max: 80 }) || undefined, message: str(b, "message", { max: 200 }) };
    const { revision } = await docs.create(input, author(req));
    return { revision, slugs: [slug] };
  }));

  r.put("/staff/pages/*slug", staff, edit(async (req) => {
    const slug = slugParam(req.params.slug);
    const b = body(req);
    const { revision } = await docs.save(slug, {
      title: str(b, "title", { max: 200 }), description: str(b, "description", { max: 400 }), markdown: rawString(b.markdown),
      sha: str(b, "sha", { required: true, max: 64 }), message: str(b, "message", { max: 200 }),
    }, author(req));
    return { revision, slugs: [slug] };
  }));

  r.post("/staff/move", staff, atLeast("publisher"), edit(async (req) => {
    const b = body(req);
    const from = str(b, "from", { required: true, max: 200 });
    const to = str(b, "to", { required: true, max: 200 }).replace(/^\/+|\/+$/g, "").toLowerCase();
    const { revision } = await docs.move(from, to, str(b, "sha", { required: true, max: 64 }), author(req));
    return { revision, slugs: [from, to] };
  }));

  r.delete("/staff/pages/*slug", staff, atLeast("publisher"), edit(async (req) => {
    const slug = slugParam(req.params.slug);
    const sha = typeof req.query.sha === "string" ? req.query.sha : "";
    if (!sha) throw new EditError(400, "Which version are you deleting? (sha is required)");
    const { revision } = await docs.remove(slug, sha, author(req));
    return { revision, slugs: [slug] };
  }));

  r.get("/staff/nav", staff, async (_req, res) => {
    res.json(await docs.rawNav());
  });

  r.put("/staff/nav", staff, atLeast("publisher"), edit(async (req) => {
    const b = body(req);
    const nav = parseNavBody(b.nav);
    const sha = b.sha === null ? null : str(b, "sha", { max: 64 }) || null;
    const { revision } = await docs.saveNav(nav, sha, author(req));
    return { revision, slugs: [] };
  }));

  r.get("/staff/history/*slug", staff, async (req, res) => {
    const slug = slugParam(req.params.slug);
    if (!SLUG.test(slug)) throw new HttpError(404, "not_found", "No such page.");
    res.json({ revisions: await docs.history(slug), repo: docs.source.kind === "github" ? docs.source.where : null });
  });

  return r;
}

/** Markdown keeps its whitespace, unlike str(), which trims. */
function rawString(v: unknown): string {
  if (v == null) return "";
  if (typeof v !== "string") throw new HttpError(400, "bad_request", "\"markdown\" must be a string.");
  return v;
}

function parseNavBody(v: unknown): Nav {
  const sections = (v as { sections?: unknown } | null)?.sections;
  if (!Array.isArray(sections) || sections.length > 40) throw new HttpError(400, "bad_request", "\"nav.sections\" must be a list.");
  return {
    sections: sections.map((s) => {
      const o = s as { title?: unknown; pages?: unknown };
      if (typeof o?.title !== "string" || !Array.isArray(o.pages) || o.pages.some((p) => typeof p !== "string")) {
        throw new HttpError(400, "bad_request", "Each section needs a title and a list of page addresses.");
      }
      return { title: o.title.slice(0, 80), pages: (o.pages as string[]).slice(0, 200) };
    }),
  };
}
