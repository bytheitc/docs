// What readers get. Everything here is public and cacheable.
//
//   GET /nav              the sidebar: sections of { slug, title, description }
//   GET /pages/*slug      one page: its Markdown, headings, and the previous and next page
//   GET /search-index     every page's title, headings and text, for the web's search box
import { Router } from "express";
import type { Ctx } from "../app.js";
import { notFound } from "../http.js";
import { SLUG } from "../pages.js";

export const slugParam = (v: unknown): string => (Array.isArray(v) ? v.join("/") : String(v ?? ""));

export function publicRoutes({ docs }: Ctx): Router {
  const r = Router();
  const cache = "public, max-age=30, stale-while-revalidate=300";

  r.get("/nav", async (_req, res) => {
    res.setHeader("Cache-Control", cache);
    res.json(await docs.nav());
  });

  r.get("/pages/*slug", async (req, res) => {
    const slug = slugParam(req.params.slug);
    if (!SLUG.test(slug)) throw notFound("No such page.");
    const found = await docs.page(slug);
    if (!found) throw notFound("No such page.");
    const { page, headings, prev, next } = found;
    res.setHeader("Cache-Control", cache);
    res.json({ page: { slug: page.slug, title: page.title, description: page.description, markdown: page.markdown, section: page.section }, headings, prev, next });
  });

  r.get("/search-index", async (_req, res) => {
    res.setHeader("Cache-Control", cache);
    res.json({ entries: await docs.searchIndex() });
  });

  return r;
}
