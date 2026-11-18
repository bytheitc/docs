// MongoDB store. Every write that decides something (which issue an event joins, whether it is a
// regression, whether an alert goes out) is one atomic operation, so several instances ingesting at
// once agree with each other.
import { randomUUID } from "node:crypto";
import { MongoClient, type Collection, type Db } from "mongodb";
import type { StoredEvent } from "../event.js";
import { fillDays } from "./memory.js";
import type { ErrorsStore, IngestOutcome, Issue, IssueQuery, Project } from "./types.js";

type EventDoc = StoredEvent & { _id: string; issueId: string; projectId: string; expireAt: Date };
type DayDoc = { _id: string; issueId: string; day: string; n: number; expireAt: Date };
const strip = <T extends { _id?: unknown }>(d: T | null): Omit<T, "_id"> | null => {
  if (!d) return null;
  const { _id, ...rest } = d;
  void _id;
  return rest;
};

export function createMongoStore(uri: string, dbName: string): ErrorsStore {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });
  let ready: Promise<{ db: Db; projects: Collection<Project>; issues: Collection<Issue>; events: Collection<EventDoc>; days: Collection<DayDoc> }> | undefined;

  const cols = () => {
    ready ??= (async () => {
      await client.connect();
      const db = client.db(dbName);
      const projects = db.collection<Project>("projects");
      const issues = db.collection<Issue>("issues");
      const events = db.collection<EventDoc>("events");
      const days = db.collection<DayDoc>("issue_days");
      await Promise.all([
        projects.createIndex({ id: 1 }, { unique: true }),
        projects.createIndex({ slug: 1 }, { unique: true }),
        projects.createIndex({ publicKey: 1 }, { unique: true }),
        issues.createIndex({ id: 1 }, { unique: true }),
        issues.createIndex({ projectId: 1, fingerprint: 1 }, { unique: true }),
        issues.createIndex({ status: 1, lastSeen: -1 }),
        issues.createIndex({ projectId: 1, status: 1, lastSeen: -1 }),
        events.createIndex({ issueId: 1, receivedAt: -1 }),
        events.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }),
        days.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("_meta").updateOne({ _id: "about" as never }, { $set: { purpose: "errors/api: projects, issues, events and daily counts for the collective's error tracker." } }, { upsert: true }),
      ]).catch((e) => {
        ready = undefined;
        throw e;
      });
      return { db, projects, issues, events, days };
    })();
    return ready;
  };

  return {
    async close() {
      await client.close();
    },
    async createProject(p) {
      const { projects } = await cols();
      try {
        await projects.insertOne({ ...p });
        return true;
      } catch (e) {
        if ((e as { code?: number }).code === 11000) return false;
        throw e;
      }
    },
    async listProjects() {
      const { projects } = await cols();
      return (await projects.find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray()) as Project[];
    },
    async getProject(id) {
      const { projects } = await cols();
      return projects.findOne({ id }, { projection: { _id: 0 } });
    },
    async getProjectBySlug(slug) {
      const { projects } = await cols();
      return projects.findOne({ slug }, { projection: { _id: 0 } });
    },

    async ingest(projectId, fingerprint, event, opts) {
      const { issues, events, days } = await cols();

      // An SDK that retries after a timeout sends the same event id again: count it once.
      const dup = await events.findOne({ _id: event.id }, { projection: { issueId: 1 } });
      if (dup) {
        const issue = await issues.findOne({ id: dup.issueId }, { projection: { _id: 0 } });
        if (issue) return { issue, outcome: "existing" as IngestOutcome };
      }

      const now = event.receivedAt;
      const env = event.environment ? [event.environment] : [];
      const rel = event.release ? [event.release] : [];
      // One pipeline update: create or bump, and reopen a resolved issue, in a single atomic step.
      const before = await issues.findOneAndUpdate(
        { projectId, fingerprint },
        [
          {
            $set: {
              id: { $ifNull: ["$id", randomUUID()] },
              projectId,
              fingerprint,
              firstSeen: { $ifNull: ["$firstSeen", now] },
              count: { $add: [{ $ifNull: ["$count", 0] }, 1] },
              lastSeen: now,
              lastEventId: event.id,
              title: event.title,
              culprit: { $ifNull: ["$culprit", event.culprit] },
              level: event.level,
              status: { $cond: [{ $eq: ["$status", "ignored"] }, "ignored", "unresolved"] },
              environments: { $setUnion: [{ $ifNull: ["$environments", []] }, env] },
              releases: { $slice: [{ $setUnion: [{ $ifNull: ["$releases", []] }, rel] }, 50] },
              resolvedAt: { $cond: [{ $eq: ["$status", "resolved"] }, "$$REMOVE", "$resolvedAt"] },
              resolvedBy: { $cond: [{ $eq: ["$status", "resolved"] }, "$$REMOVE", "$resolvedBy"] },
            },
          },
        ],
        { upsert: true, returnDocument: "before", projection: { _id: 0, status: 1 } },
      );
      const outcome: IngestOutcome = !before ? "new" : before.status === "resolved" ? "regression" : before.status === "ignored" ? "ignored" : "existing";
      const issue = (await issues.findOne({ projectId, fingerprint }, { projection: { _id: 0 } }))!;

      const day = now.toISOString().slice(0, 10);
      await Promise.all([
        events.insertOne({ ...event, _id: event.id, issueId: issue.id, projectId, expireAt: new Date(now.getTime() + opts.retentionDays * 864e5) }).catch((e) => {
          if ((e as { code?: number }).code !== 11000) throw e;
        }),
        days.updateOne({ _id: `${issue.id}|${day}` }, { $inc: { n: 1 }, $setOnInsert: { issueId: issue.id, day, expireAt: new Date(now.getTime() + 120 * 864e5) } }, { upsert: true }),
      ]);

      // Keep the newest N per issue. Checked every tenth event rather than on each one.
      if (issue.count % 10 === 0) {
        const old = await events.find({ issueId: issue.id }, { projection: { _id: 1 } }).sort({ receivedAt: -1 }).skip(opts.keepPerIssue).toArray();
        if (old.length) await events.deleteMany({ _id: { $in: old.map((o) => o._id) } });
      }
      return { issue, outcome };
    },

    async claimAlert(issueId, cooldownMs, now = new Date()) {
      const { issues } = await cols();
      const r = await issues.updateOne(
        { id: issueId, $or: [{ lastAlertAt: { $exists: false } }, { lastAlertAt: { $lt: new Date(now.getTime() - cooldownMs) } }] },
        { $set: { lastAlertAt: now } },
      );
      return r.modifiedCount === 1;
    },

    async listIssues(q: IssueQuery) {
      const { issues } = await cols();
      const filter: Record<string, unknown> = {};
      if (q.projectId) filter.projectId = q.projectId;
      const status = q.status ?? "unresolved";
      if (status !== "all") filter.status = status;
      if (q.search) {
        const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 100), "i");
        filter.$or = [{ title: rx }, { culprit: rx }];
      }
      return (await issues.find(filter, { projection: { _id: 0 } }).sort({ lastSeen: -1 }).limit(q.limit ?? 100).toArray()) as Issue[];
    },
    async getIssue(id) {
      const { issues } = await cols();
      return issues.findOne({ id }, { projection: { _id: 0 } });
    },
    async setIssueStatus(id, status, by) {
      const { issues } = await cols();
      const update = status === "resolved"
        ? { $set: { status, resolvedAt: new Date(), resolvedBy: by } }
        : { $set: { status }, $unset: { resolvedAt: "" as const, resolvedBy: "" as const } };
      return issues.findOneAndUpdate({ id }, update, { returnDocument: "after", projection: { _id: 0 } });
    },
    async listEvents(issueId, limit) {
      const { events } = await cols();
      const docs = await events.find({ issueId }).sort({ receivedAt: -1 }).limit(limit).toArray();
      return docs.map((d) => strip(d) as unknown as StoredEvent);
    },
    async getEvent(issueId, eventId) {
      const { events } = await cols();
      return strip(await events.findOne({ _id: eventId, issueId })) as unknown as StoredEvent | null;
    },
    async dailyCounts(issueId, n) {
      const { days } = await cols();
      const since = new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
      const docs = await days.find({ issueId, day: { $gte: since } }).toArray();
      return fillDays(new Map(docs.map((d) => [d.day, d.n])), n);
    },
  };
}
