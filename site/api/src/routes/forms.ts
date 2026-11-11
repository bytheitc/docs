// Public form submissions.
//   POST /forms/:form  { fields: {...}, honeypot?: "" }  →  202
// The honeypot is a visually hidden field people never fill in; bots often do. Those submissions are
// accepted and dropped, here and again in the CMS. With the CMS unreachable this answers 503 and the
// web shows "please email us instead" (ARCHITECTURE.md, rule 5).
import { Router } from "express";
import { FORMS } from "../content/collections.js";
import { HttpError, body, notFound, rateLimit } from "../http.js";
import type { Ctx } from "../app.js";

const MAX_FIELDS = 30;
const MAX_VALUE = 5000;
const FIELD_KEY = /^[a-zA-Z][a-zA-Z0-9_-]{0,40}$/;

export function formRoutes({ cms }: Ctx): Router {
  const r = Router();

  r.post(
    "/forms/:form",
    rateLimit({ max: 20, windowMs: 10 * 60_000, name: "forms", key: (req) => req.ip ?? "unknown" }),
    async (req, res) => {
      const form = req.params.form as string;
      if (!Object.hasOwn(FORMS, form)) throw notFound(`This house has no form "${form}".`);

      const b = body(req);
      if (b.honeypot != null && String(b.honeypot).trim() !== "") return void res.status(202).json({ ok: true });

      const raw = b.fields;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new HttpError(400, "bad_request", '"fields" must be an object.', { fields: "Must be an object." });
      }
      const fields: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_FIELDS)) {
        if (!FIELD_KEY.test(k)) continue;
        const val = (typeof v === "string" ? v : v == null ? "" : String(v)).trim().slice(0, MAX_VALUE);
        if (val) fields[k] = val;
      }
      if (!Object.keys(fields).length) {
        throw new HttpError(400, "validation_failed", "The submission is empty.", { fields: "The submission is empty." });
      }

      const result = await cms.submit(form, fields, typeof b.honeypot === "string" ? b.honeypot : undefined);
      if (result.ok) return void res.status(202).json({ ok: true });
      throw new HttpError(result.status, result.status === 400 ? "validation_failed" : "unavailable", result.message, result.fields);
    },
  );

  return r;
}
