// Management API: a signed-in user, checked for role and space access on every request.
// The workflow is the per-app kit's, unchanged: editors draft and submit; publishers publish, reorder and delete;
// edits to a live entry are held as pending until a publisher publishes them; every action is audited.
import { Router, type Request } from "express";
import { can, canAccess, requireRole, requireSpace, userAuth } from "../auth.js";
import {
  HttpError, badRequest, body, conflict, forbidden, invalid, notFound, oneOf, str,
} from "../http.js";
import type { Ctx } from "../app.js";
import {
  DuplicateIdError, SUBMISSION_STATUSES, type CollectionDef, type Entry, type SpaceRecord, type Status, type Submission,
  type SubmissionStatus, type SubmissionReply, type User,
} from "../types.js";
import { validateEntry } from "../validate.js";
import { isAddress } from "../mail.js";
import { fireWebhook, type WebhookEvent } from "../webhooks.js";

type Intent = "save" | "submit" | "publish";
const INTENTS: Intent[] = ["save", "submit", "publish"];
const STATUS_TARGETS = ["review", "published", "draft", "archived", "publish-pending", "discard-pending"] as const;
type StatusTarget = (typeof STATUS_TARGETS)[number];

export function manageRoutes({ config, store, mailer }: Ctx): Router {
  const r = Router();
  r.use("/v1/spaces", userAuth(store));

  const audit = (space: string | null, actor: User | null, action: string, target?: string, detail?: string) =>
    store.addAudit({ at: new Date(), space, actor: actor?.email ?? null, action, target, detail });
  const hook = (space: SpaceRecord, collection: string, id: string, event: WebhookEvent) =>
    fireWebhook(config, store, space, { collection, id, event });

  const titleOf = (def: CollectionDef, e: Entry) => String(e.data[def.titleField] ?? e.id);

  /* ---------------- spaces ---------------- */

  r.get("/v1/spaces", async (req, res) => {
    const user = req.user!;
    const spaces = (await store.listSpaces()).filter((s) => canAccess(user, s.id));
    const out = await Promise.all(spaces.map(async (s) => {
      const lists = await Promise.all(s.collections.map((c) => store.listEntries(s.id, c.name)));
      return {
        id: s.id, label: s.label, title: s.title,
        collections: s.collections.length,
        entries: lists.reduce((n, l) => n + l.length, 0),
        waiting: lists.reduce((n, l) => n + l.filter((e) => e.status === "review" || e.pending).length, 0),
        inboxNew: await store.countSubmissions(s.id, { status: "new" }),
        updatedAt: s.updatedAt,
      };
    }));
    res.json({ spaces: out });
  });

  r.get("/v1/spaces/:space", async (req, res) => {
    const user = req.user!;
    const space = await requireSpace(store, req, req.params.space as string);
    const counts: Record<string, { total: number; published: number }> = {};
    const review: { collection: string; id: string; title: string; pending: boolean }[] = [];
    await Promise.all(space.collections.map(async (c) => {
      const all = await store.listEntries(space.id, c.name);
      counts[c.name] = { total: all.length, published: all.filter((e) => e.status === "published").length };
      for (const e of all) if (e.status === "review" || e.pending) review.push({ collection: c.name, id: e.id, title: titleOf(c, e), pending: !!e.pending });
    }));
    res.json({
      space: {
        id: space.id, label: space.label, title: space.title, collections: space.collections, forms: space.forms,
        links: space.links.filter((l) => can(user, l.role ?? "editor")),
        webhook: !!space.webhook, updatedAt: space.updatedAt,
      },
      counts,
      review,
      inboxNew: await store.countSubmissions(space.id, { status: "new" }),
      recent: await store.listAudit({ space: space.id, limit: 8 }),
    });
  });

  /* ---------------- entries ---------------- */

  const collectionOf = (space: SpaceRecord, name: string): CollectionDef => {
    const def = space.collections.find((c) => c.name === name);
    if (!def) throw notFound(`The ${space.label} space has no collection "${name}".`);
    return def;
  };
  async function load(req: Request) {
    const space = await requireSpace(store, req, req.params.space as string);
    const def = collectionOf(space, req.params.collection as string);
    return { space, def, user: req.user! };
  }
  async function loadEntry(req: Request) {
    const ctx = await load(req);
    const entry = await store.getEntry(ctx.space.id, ctx.def.name, req.params.id as string);
    if (!entry) throw notFound("That entry doesn't exist.");
    return { ...ctx, entry };
  }
  const readIntent = (b: Record<string, unknown>, user: User): Intent => {
    const intent = oneOf(b, "intent", INTENTS, "save");
    if (intent === "publish" && !can(user, "publisher")) throw forbidden("Only publishers can publish.");
    return intent;
  };
  const readData = (def: CollectionDef, b: Record<string, unknown>) => {
    const { data, id, errors } = validateEntry(def, b.data);
    if (Object.keys(errors).length) throw invalid(errors);
    return { data, id };
  };
  const dupe = (def: CollectionDef) => conflict("That id is already used by another entry.", { [def.idField]: "That id is already used by another entry." });

  const base = "/v1/spaces/:space/collections/:collection/entries";

  r.get(base, async (req, res) => {
    const { space, def } = await load(req);
    res.json({ entries: await store.listEntries(space.id, def.name) });
  });

  r.post(base, async (req, res) => {
    const { space, def, user } = await load(req);
    const b = body(req);
    const intent = readIntent(b, user);
    const { data, id } = readData(def, b);
    if (def.singleton && (await store.countEntries(space.id, def.name)) > 0) throw conflict(`${def.singular} already exists.`);
    const now = new Date();
    const status: Status = intent === "publish" ? "published" : intent === "submit" ? "review" : "draft";
    const entry: Entry = {
      space: space.id, collection: def.name, id, status, position: (await store.maxPosition(space.id, def.name)) + 1, data,
      createdAt: now, updatedAt: now, updatedBy: user.email, pending: null,
    };
    try {
      await store.createEntry(entry);
    } catch (e) {
      if (e instanceof DuplicateIdError) throw dupe(def);
      throw e;
    }
    await store.addRevision({ space: space.id, collection: def.name, entryId: id, status, data, author: user.email, at: now, note: "created" });
    await audit(space.id, user, `entry.create.${status}`, `${def.name}/${id}`);
    if (status === "published") hook(space, def.name, id, "publish");
    res.status(201).json({ entry, message: status === "published" ? "Published." : status === "review" ? "Saved and waiting for review." : "Draft saved." });
  });

  r.get(`${base}/:id`, async (req, res) => {
    const { entry } = await loadEntry(req);
    res.json({ entry });
  });

  r.put(`${base}/:id`, async (req, res) => {
    const { space, def, user, entry: existing } = await loadEntry(req);
    const b = body(req);
    const intent = readIntent(b, user);
    const { data, id } = readData(def, b);
    const now = new Date();
    const renaming = id !== existing.id;

    if (existing.status === "published" && intent !== "publish") {
      // Live entry: hold the edit as pending changes. Delivery keeps returning the published version.
      if (renaming) throw invalid({ [def.idField]: "A live entry's id can only be changed by a publisher, when publishing." });
      await store.updateEntry(space.id, def.name, existing.id, { pending: { data, by: user.email, at: now }, updatedBy: user.email });
      await store.addRevision({
        space: space.id, collection: def.name, entryId: id, status: "review", data, author: user.email, at: now,
        note: intent === "submit" ? "changes submitted for review" : "changes saved as pending",
      });
      await audit(space.id, user, "entry.pending", `${def.name}/${id}`);
      const entry = await store.getEntry(space.id, def.name, id);
      return void res.json({ entry, held: true, message: "Saved. The live version is unchanged until a publisher publishes these changes." });
    }

    const status: Status = intent === "publish" ? "published" : intent === "submit" ? "review" : existing.status === "review" ? "review" : "draft";
    try {
      await store.updateEntry(space.id, def.name, existing.id, { data, status, pending: null, updatedBy: user.email, newId: renaming ? id : undefined });
    } catch (e) {
      if (e instanceof DuplicateIdError) throw dupe(def);
      throw e;
    }
    await store.addRevision({ space: space.id, collection: def.name, entryId: id, status, data, author: user.email, at: now, note: intent });
    await audit(space.id, user, `entry.${intent}`, `${def.name}/${id}`, renaming ? `renamed from ${existing.id}` : undefined);
    if (status === "published") hook(space, def.name, id, existing.status === "published" ? "update" : "publish");
    if (renaming && existing.status === "published") hook(space, def.name, existing.id, "delete");
    const entry = await store.getEntry(space.id, def.name, id);
    res.json({ entry, held: false, message: status === "published" ? "Published." : status === "review" ? "Saved and waiting for review." : "Draft saved." });
  });

  r.delete(`${base}/:id`, async (req, res) => {
    const { space, def, user, entry } = await loadEntry(req);
    requireRole(req, "publisher");
    if (str(body(req), "confirm", { max: 200 }) !== entry.id) throw invalid({ confirm: "Type the entry's id to confirm deletion." }, "Type the entry's id to confirm deletion.");
    await store.deleteEntry(space.id, def.name, entry.id);
    await audit(space.id, user, "entry.delete", `${def.name}/${entry.id}`);
    if (entry.status === "published") hook(space, def.name, entry.id, "delete");
    res.status(204).end();
  });

  /** Status changes from the editor's workflow bar. */
  r.post(`${base}/:id/status`, async (req, res) => {
    const { space, def, user, entry } = await loadEntry(req);
    const to = oneOf<StatusTarget>(body(req), "to", STATUS_TARGETS);
    const now = new Date();
    let event: WebhookEvent | null = null;

    if (to === "review") {
      if (entry.status === "published") throw badRequest("This entry is live. Use “Submit changes” in the editor instead.");
      await store.updateEntry(space.id, def.name, entry.id, { status: "review", updatedBy: user.email });
    } else {
      if (!can(user, "publisher")) throw forbidden("Only publishers can do that.");
      if (to === "publish-pending") {
        if (!entry.pending) throw badRequest("There are no pending changes.");
        await store.updateEntry(space.id, def.name, entry.id, { data: entry.pending.data, pending: null, status: "published", updatedBy: user.email });
        await store.addRevision({ space: space.id, collection: def.name, entryId: entry.id, status: "published", data: entry.pending.data, author: user.email, at: now, note: "pending changes published" });
        event = entry.status === "published" ? "update" : "publish";
      } else if (to === "discard-pending") {
        if (!entry.pending) throw badRequest("There are no pending changes.");
        await store.updateEntry(space.id, def.name, entry.id, { pending: null, updatedBy: user.email });
      } else {
        await store.updateEntry(space.id, def.name, entry.id, { status: to, updatedBy: user.email });
        await store.addRevision({ space: space.id, collection: def.name, entryId: entry.id, status: to, data: entry.data, author: user.email, at: now, note: `status → ${to}` });
        if (to === "published" && entry.status !== "published") event = "publish";
        if (to !== "published" && entry.status === "published") event = "unpublish";
      }
    }
    await audit(space.id, user, `entry.status.${to}`, `${def.name}/${entry.id}`);
    if (event) hook(space, def.name, entry.id, event);
    res.json({ entry: await store.getEntry(space.id, def.name, entry.id) });
  });

  /** Moves an entry one place up or down in its collection's public order. */
  r.post(`${base}/:id/move`, async (req, res) => {
    const { space, def, user } = await load(req);
    requireRole(req, "publisher");
    const dir = oneOf(body(req), "dir", ["up", "down"] as const);
    const list = await store.listEntries(space.id, def.name);
    const i = list.findIndex((e) => e.id === req.params.id);
    if (i < 0) throw notFound("That entry doesn't exist.");
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return void res.json({ moved: false });
    // Re-number the whole list so positions stay dense even after deletions.
    const ordered = [...list];
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    await Promise.all(ordered.map((e, k) => (e.position === k ? null : store.updateEntry(space.id, def.name, e.id, { position: k }))));
    await audit(space.id, user, "entry.move", `${def.name}/${list[i].id}`, dir);
    if (list[i].status === "published" || list[j].status === "published") hook(space, def.name, list[i].id, "move");
    res.json({ moved: true });
  });

  r.get(`${base}/:id/revisions`, async (req, res) => {
    const { space, def, entry } = await loadEntry(req);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    res.json({ revisions: await store.listRevisions(space.id, def.name, entry.id, limit) });
  });

  /** Loads an old revision into the entry as a draft (or as pending changes, if live). */
  r.post(`${base}/:id/restore`, async (req, res) => {
    const { space, def, user, entry } = await loadEntry(req);
    const at = new Date(str(body(req), "at", { required: true, max: 40 }));
    if (Number.isNaN(at.getTime())) throw invalid({ at: "Give the revision's time as an ISO date." });
    const rev = (await store.listRevisions(space.id, def.name, entry.id, 100)).find((x) => x.at.getTime() === at.getTime());
    if (!rev) throw notFound("Revision not found.");
    const now = new Date();
    if (entry.status === "published") {
      await store.updateEntry(space.id, def.name, entry.id, { pending: { data: rev.data, by: user.email, at: now }, updatedBy: user.email });
    } else {
      await store.updateEntry(space.id, def.name, entry.id, { data: rev.data, updatedBy: user.email });
    }
    await store.addRevision({ space: space.id, collection: def.name, entryId: entry.id, status: entry.status, data: rev.data, author: user.email, at: now, note: `restored from ${rev.at.toISOString()}` });
    await audit(space.id, user, "entry.restore", `${def.name}/${entry.id}`, rev.at.toISOString());
    res.json({ entry: await store.getEntry(space.id, def.name, entry.id), held: entry.status === "published" });
  });

  /* ---------------- inbox ---------------- */

  r.get("/v1/spaces/:space/inbox", async (req, res) => {
    const space = await requireSpace(store, req, req.params.space as string);
    const status = typeof req.query.status === "string" && SUBMISSION_STATUSES.includes(req.query.status as SubmissionStatus) ? (req.query.status as SubmissionStatus) : undefined;
    const form = typeof req.query.form === "string" && req.query.form ? req.query.form : undefined;
    res.json({ submissions: await store.listSubmissions(space.id, { status, form }) });
  });

  r.get("/v1/spaces/:space/inbox/:id", async (req, res) => {
    const space = await requireSpace(store, req, req.params.space as string);
    const sub = await store.getSubmission(space.id, req.params.id as string);
    if (!sub) throw notFound("That submission doesn't exist.");
    res.json({ submission: sub });
  });

  r.patch("/v1/spaces/:space/inbox/:id", async (req, res) => {
    const space = await requireSpace(store, req, req.params.space as string);
    const user = req.user!;
    const sub = await store.getSubmission(space.id, req.params.id as string);
    if (!sub) throw notFound("That submission doesn't exist.");
    const b = body(req);
    const patch: { status?: SubmissionStatus; note?: string } = {};
    if (b.status != null) patch.status = oneOf(b, "status", SUBMISSION_STATUSES);
    if (b.note !== undefined) patch.note = str(b, "note", { max: 5000 }) || undefined;
    if (!("status" in patch) && !("note" in b)) throw badRequest("Nothing to change: send status and/or note.");
    await store.updateSubmission(space.id, sub.id, patch);
    await audit(space.id, user, `inbox.${patch.status ?? "note"}`, sub.id);
    res.json({ submission: await store.getSubmission(space.id, sub.id) });
  });

  /**
   * Replies to a submission by email. The CMS stays generic: it does not know what any form means,
   * so the address is simply the submission's own "email" field, or the first field that holds one.
   * The reply is stored with the submission, so the next editor can see what was already said.
   */
  r.post("/v1/spaces/:space/inbox/:id/reply", async (req, res) => {
    const space = await requireSpace(store, req, req.params.space as string);
    const user = req.user!;
    const sub = await store.getSubmission(space.id, req.params.id as string);
    if (!sub) throw notFound("That submission doesn't exist.");

    const to = replyAddress(sub);
    if (!to) throw badRequest("This submission left no email address, so there is nobody to reply to.", { to: "No address." });

    const b = body(req);
    const subject = str(b, "subject", { max: 200 }) || `Re: ${space.forms[sub.form] ?? sub.form}`;
    const text = str(b, "body", { required: true, max: 20_000 });

    const sent = await mailer.send({ to, subject, text, replyTo: user.email });
    if (!sent.ok) throw new HttpError(502, "unavailable", `The reply could not be sent. ${sent.error}`);

    const reply: SubmissionReply = { at: new Date(), by: user.email, to, subject, body: text };
    await store.addSubmissionReply(space.id, sub.id, reply);
    // Replying is the work: a submission nobody has answered is the one that still needs attention.
    if (sub.status === "new") await store.updateSubmission(space.id, sub.id, { status: "in-progress" });
    await audit(space.id, user, "inbox.reply", sub.id, to);

    res.json({ submission: await store.getSubmission(space.id, sub.id), delivered: mailer.delivers });
  });

  return r;
}

/** The address to answer a submission at, or null. */
function replyAddress(sub: Submission): string | null {
  const named = sub.data.email ?? sub.data.Email;
  if (named && isAddress(named)) return named.trim();
  for (const v of Object.values(sub.data)) if (isAddress(v)) return v.trim();
  return null;
}

