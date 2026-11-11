// Content delivery for this house's web.
//   GET /content/:collection       { entries: [...] }
//   GET /content/:collection/:id   { entry: {...} }
// X-Content-Source says where the answer came from: "cms" or the built-in "seed".
import { Router } from "express";
import { findCollection } from "../content/collections.js";
import { notFound } from "../http.js";
import type { Ctx } from "../app.js";

const NAME = /^[a-z][a-z0-9_-]{0,47}$/;

export function contentRoutes({ cms }: Ctx): Router {
  const r = Router();

  const collectionOr404 = (name: string) => {
    if (!NAME.test(name) || !findCollection(name)) throw notFound(`No collection "${name}" in this house.`);
    return name;
  };

  r.get("/content/:collection", async (req, res) => {
    const name = collectionOr404(req.params.collection as string);
    const { entries, source } = await cms.content(name);
    res.setHeader("X-Content-Source", source);
    res.json({ entries });
  });

  r.get("/content/:collection/:id", async (req, res) => {
    const name = collectionOr404(req.params.collection as string);
    const { entry, source } = await cms.entry(name, req.params.id as string);
    res.setHeader("X-Content-Source", source);
    if (!entry) throw notFound("No published entry with that id.");
    res.json({ entry });
  });

  return r;
}
