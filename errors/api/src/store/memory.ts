// The same contract as mongo.ts, in memory. Used by the tests, and by `npm run dev` with no database.
import { randomUUID } from "node:crypto";
import type { StoredEvent } from "../event.js";
import type { ErrorsStore, IngestOutcome, Issue, IssueQuery, IssueStatus, Project } from "./types.js";

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

export function createMemoryStore(): ErrorsStore {
  const projects = new Map<string, Project>();
  const issues = new Map<string, Issue>();
  const events = new Map<string, StoredEvent & { issueId: string; expireAt: Date }>();
  const dayCounts = new Map<string, number>(); // issueId|day -> events, independent of trimming

  return {
    async close() {},
    async createProject(p) {
      if ([...projects.values()].some((x) => x.slug === p.slug || x.publicKey === p.publicKey)) return false;
      projects.set(p.id, { ...p });
      return true;
    },
    async listProjects() {
      return [...projects.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
    async getProject(id) {
      return projects.get(id) ?? null;
    },
    async getProjectBySlug(slug) {
      return [...projects.values()].find((p) => p.slug === slug) ?? null;
    },

    async ingest(projectId, fingerprint, event, opts) {
      const dup = events.get(event.id);
      if (dup) return { issue: { ...issues.get(dup.issueId)! }, outcome: "existing" as IngestOutcome };
      let issue = [...issues.values()].find((i) => i.projectId === projectId && i.fingerprint === fingerprint);
      let outcome: IngestOutcome;
      if (!issue) {
        issue = {
          id: randomUUID(), projectId, fingerprint, title: event.title, culprit: event.culprit, level: event.level,
          status: "unresolved", count: 0, firstSeen: event.receivedAt, lastSeen: event.receivedAt, lastEventId: event.id,
          environments: [], releases: [],
        };
        issues.set(issue.id, issue);
        outcome = "new";
      } else if (issue.status === "resolved") {
        issue.status = "unresolved";
        delete issue.resolvedAt;
        delete issue.resolvedBy;
        outcome = "regression";
      } else {
        outcome = issue.status === "ignored" ? "ignored" : "existing";
      }
      issue.count++;
      issue.lastSeen = event.receivedAt;
      issue.lastEventId = event.id;
      issue.title = event.title;
      issue.level = event.level;
      if (event.environment && !issue.environments.includes(event.environment)) issue.environments.push(event.environment);
      if (event.release && !issue.releases.includes(event.release) && issue.releases.length < 50) issue.releases.push(event.release);

      const dk = `${issue.id}|${dayOf(event.receivedAt)}`;
      dayCounts.set(dk, (dayCounts.get(dk) ?? 0) + 1);
      events.set(event.id, { ...event, issueId: issue.id, expireAt: new Date(event.receivedAt.getTime() + opts.retentionDays * 864e5) });
      const mine = [...events.values()].filter((e) => e.issueId === issue!.id).sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
      for (const old of mine.slice(opts.keepPerIssue)) events.delete(old.id);
      return { issue: { ...issue }, outcome };
    },

    async claimAlert(issueId, cooldownMs, now = new Date()) {
      const i = issues.get(issueId);
      if (!i) return false;
      if (i.lastAlertAt && now.getTime() - i.lastAlertAt.getTime() < cooldownMs) return false;
      i.lastAlertAt = now;
      return true;
    },

    async listIssues(q: IssueQuery) {
      const status = q.status ?? "unresolved";
      const s = q.search?.toLowerCase();
      return [...issues.values()]
        .filter((i) => (!q.projectId || i.projectId === q.projectId) && (status === "all" || i.status === status) && (!s || i.title.toLowerCase().includes(s) || i.culprit.toLowerCase().includes(s)))
        .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
        .slice(0, q.limit ?? 100)
        .map((i) => ({ ...i }));
    },
    async getIssue(id) {
      const i = issues.get(id);
      return i ? { ...i } : null;
    },
    async setIssueStatus(id, status: IssueStatus, by) {
      const i = issues.get(id);
      if (!i) return null;
      i.status = status;
      if (status === "resolved") { i.resolvedAt = new Date(); i.resolvedBy = by; } else { delete i.resolvedAt; delete i.resolvedBy; }
      return { ...i };
    },
    async listEvents(issueId, limit) {
      return [...events.values()].filter((e) => e.issueId === issueId).sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime()).slice(0, limit);
    },
    async getEvent(issueId, eventId) {
      const e = events.get(eventId);
      return e && e.issueId === issueId ? e : null;
    },
    async dailyCounts(issueId, days) {
      const counts = new Map<string, number>();
      for (const [k, n] of dayCounts) if (k.startsWith(`${issueId}|`)) counts.set(k.slice(issueId.length + 1), n);
      return fillDays(counts, days);
    },
  };
}

export function fillDays(counts: Map<string, number>, days: number): { day: string; count: number }[] {
  const out: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayOf(new Date(Date.now() - i * 864e5));
    out.push({ day, count: counts.get(day) ?? 0 });
  }
  return out;
}
