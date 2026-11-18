// Templates: the Markdown source for a campaign, plus a live preview.
//
//   GET    /templates
//   POST   /templates             { name, subject, bodyMarkdown? }   a draft may start with an empty body
//   GET    /templates/:id
//   PUT    /templates/:id         { name?, subject?, bodyMarkdown? }
//   DELETE /templates/:id
//   POST   /templates/preview     { bodyMarkdown, sampleFields? } -> { html, text }
import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { Ctx } from "../app.js";
import { body, notFound, str } from "../http.js";
import { needsDatabase, needsStaff } from "../guard.js";
import { applyMergeTags, renderEmail } from "../render.js";
import { requireEmailStore } from "../store/index.js";

export function templatesRoutes(ctx: Ctx): Router {
  const r = Router();
  r.use("/templates", needsDatabase, needsStaff(ctx.cms));

  r.get("/templates", async (_req, res) => {
    res.json({ templates: await requireEmailStore().listTemplates() });
  });

  r.post("/templates", async (req, res) => {
    const b = body(req);
    const template = await requireEmailStore().createTemplate({
      id: randomUUID(),
      name: str(b, "name", { required: true, max: 120 }),
      subject: str(b, "subject", { required: true, max: 200 }),
      bodyMarkdown: str(b, "bodyMarkdown", { max: 50_000 }),
    });
    res.status(201).json({ template });
  });

  r.get("/templates/:id", async (req, res) => {
    const template = await requireEmailStore().getTemplate(req.params.id);
    if (!template) throw notFound("No such template.");
    res.json({ template });
  });

  r.put("/templates/:id", async (req, res) => {
    const b = body(req);
    const patch: Record<string, string> = {};
    if (b.name !== undefined) patch.name = str(b, "name", { required: true, max: 120 });
    if (b.subject !== undefined) patch.subject = str(b, "subject", { required: true, max: 200 });
    if (b.bodyMarkdown !== undefined) patch.bodyMarkdown = str(b, "bodyMarkdown", { max: 50_000 });
    const template = await requireEmailStore().updateTemplate(req.params.id, patch);
    if (!template) throw notFound("No such template.");
    res.json({ template });
  });

  r.delete("/templates/:id", async (req, res) => {
    await requireEmailStore().deleteTemplate(req.params.id);
    res.status(204).end();
  });

  r.post("/templates/preview", (req, res) => {
    const b = body(req);
    const bodyMarkdown = str(b, "bodyMarkdown", { required: true, max: 50_000 });
    const sampleFields = (b.sampleFields && typeof b.sampleFields === "object" ? b.sampleFields : {}) as Record<string, string>;
    const merged = applyMergeTags(bodyMarkdown, sampleFields);
    const rendered = renderEmail(merged, { unsubscribeUrl: `${ctx.config.web.url}/unsubscribe/preview` });
    res.json(rendered);
  });

  return r;
}
