// An in-memory EmailStore for tests. It mirrors the guarantees the Mongo store gets from its
// unique indexes and conditional updates: atomic draft -> sending, one send record per
// (campaign, contact), and leases that can only be taken once expired.
import type { Campaign, Contact, EmailList, EmailStore, SendRecord, Suppression, Template, TransactionalRecord } from "../src/store/types.js";

export function createMemoryStore() {
  const lists = new Map<string, EmailList>();
  const contacts: Contact[] = [];
  const suppressions = new Map<string, Suppression>();
  const templates = new Map<string, Template>();
  const campaigns = new Map<string, Campaign>();
  const sends: SendRecord[] = [];
  const transactional: TransactionalRecord[] = [];
  const clone = <T>(x: T): T => structuredClone(x);

  const store: EmailStore = {
    async createList(l) { const d = { ...l, contactCount: 0, createdAt: new Date(), updatedAt: new Date() }; lists.set(l.id, d); return clone(d); },
    async listLists() { return [...lists.values()].map(clone); },
    async getList(id) { const l = lists.get(id); return l ? clone(l) : null; },
    async deleteList(id) { lists.delete(id); },
    async bumpListFields(id, names) { const l = lists.get(id); if (l) l.fieldNames = [...new Set([...l.fieldNames, ...names])]; },

    async insertContacts(cs) {
      let inserted = 0;
      for (const c of cs) {
        if (contacts.some((x) => x.listId === c.listId && x.email === c.email)) continue;
        contacts.push({ ...c, createdAt: new Date() });
        inserted++;
      }
      const l = lists.get(cs[0]?.listId ?? "");
      if (l) l.contactCount += inserted;
      return { inserted, skipped: cs.length - inserted };
    },
    async listContacts(listId, { limit, offset }) {
      const all = contacts.filter((c) => c.listId === listId);
      return { contacts: all.slice(offset, offset + limit).map(clone), total: all.length };
    },
    async getContactByToken(t) { const c = contacts.find((x) => x.unsubscribeToken === t); return c ? clone(c) : null; },
    async setContactStatus(id, status) { const c = contacts.find((x) => x.id === id); if (c) c.status = status; },
    async setStatusForEmail(email, status) {
      let n = 0;
      for (const c of contacts) if (c.email === email.toLowerCase()) { c.status = status; n++; }
      return n;
    },

    async isSuppressed(email) { return suppressions.has(email.toLowerCase()); },
    async getSuppression(email) { const s = suppressions.get(email.toLowerCase()); return s ? clone(s) : null; },
    async addSuppression(s) { suppressions.set(s.email.toLowerCase(), { ...s, email: s.email.toLowerCase() }); },

    async createTemplate(t) { const d = { ...t, createdAt: new Date(), updatedAt: new Date() }; templates.set(t.id, d); return clone(d); },
    async listTemplates() { return [...templates.values()].map(clone); },
    async getTemplate(id) { const t = templates.get(id); return t ? clone(t) : null; },
    async updateTemplate(id, patch) { const t = templates.get(id); if (!t) return null; Object.assign(t, patch, { updatedAt: new Date() }); return clone(t); },
    async deleteTemplate(id) { templates.delete(id); },

    async createCampaign(c) {
      const d: Campaign = { ...c, status: "draft", stats: { total: 0, sent: 0, failed: 0, skipped: 0 }, createdAt: new Date() };
      campaigns.set(c.id, d);
      return clone(d);
    },
    async listCampaigns() { return [...campaigns.values()].map(clone); },
    async getCampaign(id) { const c = campaigns.get(id); return c ? clone(c) : null; },
    async deleteCampaign(id) { campaigns.delete(id); },
    async claimCampaignForSending(id, { total, leaseUntil, sentBy }) {
      const c = campaigns.get(id);
      if (!c || c.status !== "draft") return null;
      Object.assign(c, { status: "sending", startedAt: new Date(), leaseUntil, sentBy, stats: { total, sent: 0, failed: 0, skipped: 0 } });
      return clone(c);
    },
    async takeOverInterruptedCampaign(id, leaseUntil) {
      const c = campaigns.get(id);
      if (!c || c.status !== "sending" || (c.leaseUntil && c.leaseUntil >= new Date())) return null;
      c.leaseUntil = leaseUntil;
      return clone(c);
    },
    async listInterruptedCampaigns() {
      return [...campaigns.values()].filter((c) => c.status === "sending" && (!c.leaseUntil || c.leaseUntil < new Date())).map(clone);
    },
    async renewCampaignLease(id, leaseUntil) { const c = campaigns.get(id); if (c?.status === "sending") c.leaseUntil = leaseUntil; },
    async bumpCampaignStats(id, delta) {
      const c = campaigns.get(id);
      if (c) for (const [k, v] of Object.entries(delta)) c.stats[k as keyof typeof c.stats] += v as number;
    },
    async finishCampaign(id, status) { const c = campaigns.get(id); if (c) { c.status = status; c.finishedAt = new Date(); delete c.leaseUntil; } },

    async beginSend(s) {
      if (sends.some((x) => x.campaignId === s.campaignId && x.contactId === s.contactId)) return false;
      sends.push({ ...s, at: new Date() });
      return true;
    },
    async completeSend(campaignId, contactId, outcome) {
      const s = sends.find((x) => x.campaignId === campaignId && x.contactId === contactId && x.status === "pending");
      if (s) Object.assign(s, outcome);
    },
    async closeOrphanedSends(campaignId) {
      let n = 0;
      for (const s of sends) if (s.campaignId === campaignId && s.status === "pending") { s.status = "failed"; s.error = "Interrupted"; n++; }
      return n;
    },
    async listSends(campaignId) { return sends.filter((s) => s.campaignId === campaignId).map(clone); },

    async addTransactional(t) { transactional.push({ ...t, at: new Date() }); },
    async listTransactional() { return transactional.map(clone); },
  };

  /** Test-only: back-date a campaign's lease, as if its worker died. */
  const expireLease = (id: string) => { const c = campaigns.get(id); if (c) c.leaseUntil = new Date(Date.now() - 1000); };
  return { store, sends, expireLease };
}
