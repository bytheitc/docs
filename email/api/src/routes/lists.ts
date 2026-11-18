// Recipient lists: create one, upload a CSV into it, browse its contacts.
//
//   GET    /lists
//   POST   /lists                       { name }
//   GET    /lists/:id?limit=&offset=
//   DELETE /lists/:id
//   POST   /lists/:id/upload            { csv: "email,first_name\n..." }
import { randomBytes, randomUUID } from "node:crypto";
import { Router } from "express";
import type { Ctx } from "../app.js";
import { parseContactsCsv } from "../csv.js";
import { badRequest, body, notFound, str, HttpError } from "../http.js";
import { needsDatabase, needsStaff } from "../guard.js";
import { requireEmailStore } from "../store/index.js";

const MAX_CSV_BYTES = 5_000_000;

export function listsRoutes(ctx: Ctx): Router {
  const r = Router();
  r.use("/lists", needsDatabase, needsStaff(ctx.cms));

  r.get("/lists", async (_req, res) => {
    res.json({ lists: await requireEmailStore().listLists() });
  });

  r.post("/lists", async (req, res) => {
    const name = str(body(req), "name", { required: true, max: 120 });
    const list = await requireEmailStore().createList({ id: randomUUID(), name, fieldNames: [] });
    res.status(201).json({ list });
  });

  r.get("/lists/:id", async (req, res) => {
    const store = requireEmailStore();
    const list = await store.getList(req.params.id);
    if (!list) throw notFound("No such list.");
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { contacts, total } = await store.listContacts(list.id, { limit, offset });
    res.json({ list, contacts, total });
  });

  r.delete("/lists/:id", async (req, res) => {
    await requireEmailStore().deleteList(req.params.id);
    res.status(204).end();
  });

  r.post("/lists/:id/upload", async (req, res) => {
    const store = requireEmailStore();
    const list = await store.getList(req.params.id);
    if (!list) throw notFound("No such list.");
    const csv = str(body(req), "csv", { required: true });
    if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) throw badRequest("That CSV is too large (max 5MB).");

    let parsed: ReturnType<typeof parseContactsCsv>;
    try {
      parsed = parseContactsCsv(csv);
    } catch (e) {
      throw new HttpError(400, "bad_request", (e as Error).message);
    }

    const suppressed = new Set<string>();
    for (const row of parsed.rows) if (await store.isSuppressed(row.email)) suppressed.add(row.email);

    const contacts = parsed.rows
      .filter((row) => !suppressed.has(row.email))
      .map((row) => ({
        id: randomUUID(),
        listId: list.id,
        email: row.email,
        fields: row.fields,
        status: "subscribed" as const,
        unsubscribeToken: randomBytes(24).toString("base64url"),
      }));

    if (parsed.fieldNames.length) await store.bumpListFields(list.id, parsed.fieldNames);
    const { inserted, skipped } = await store.insertContacts(contacts);
    res.json({
      inserted,
      skippedInvalid: parsed.skipped,
      skippedSuppressed: suppressed.size,
      skippedDuplicate: skipped,
      fieldNames: parsed.fieldNames,
    });
  });

  return r;
}
