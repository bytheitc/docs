// This house's own data (itc_email). Only this api touches it (ARCHITECTURE.md, rule 2).

export interface EmailList {
  id: string;
  name: string;
  /** Column names found in the CSV, beyond "email" — available as merge tags. */
  fieldNames: string[];
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ContactStatus = "subscribed" | "unsubscribed" | "bounced";

export interface Contact {
  id: string;
  listId: string;
  email: string;
  /** Dynamic fields from the CSV's other columns, e.g. first_name, org. */
  fields: Record<string, string>;
  status: ContactStatus;
  /** Opaque, unguessable: the token in this contact's unsubscribe link. */
  unsubscribeToken: string;
  createdAt: Date;
}

export interface Suppression {
  email: string;
  reason: "unsubscribed" | "bounced" | "complained";
  at: Date;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  /** The author's source. Merge tags look like {{first_name}}. */
  bodyMarkdown: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CampaignStatus = "draft" | "sending" | "sent" | "failed";

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  listId: string;
  status: CampaignStatus;
  stats: CampaignStats;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  /**
   * While sending: the worker holding this campaign owns it until this time and renews it as it
   * goes. A "sending" campaign whose lease has run out was interrupted (a restart, a crash) and is
   * picked up again on the next boot.
   */
  leaseUntil?: Date;
  /** The staff account that pressed Send. */
  sentBy?: string;
}

export interface SendRecord {
  id: string;
  campaignId: string;
  contactId: string;
  email: string;
  /**
   * "pending" is written before the provider is called and is unique per (campaign, contact):
   * it is what stops a contact being mailed twice by two workers, or again after a restart.
   */
  status: "pending" | "sent" | "failed" | "skipped";
  error?: string;
  providerId?: string;
  at: Date;
}

/** One message sent on another house's behalf through POST /transactional. Never the body. */
export interface TransactionalRecord {
  id: string;
  /** The calling house, from its service key. */
  service: string;
  /** What kind of message, e.g. "magic-link", "application-received". */
  category: string;
  to: string;
  subject: string;
  status: "sent" | "failed" | "suppressed";
  error?: string;
  providerId?: string;
  at: Date;
}

export interface EmailStore {
  // Lists
  createList(l: Omit<EmailList, "contactCount" | "createdAt" | "updatedAt">): Promise<EmailList>;
  listLists(): Promise<EmailList[]>;
  getList(id: string): Promise<EmailList | null>;
  deleteList(id: string): Promise<void>;
  bumpListFields(id: string, fieldNames: string[]): Promise<void>;

  // Contacts
  insertContacts(contacts: Omit<Contact, "createdAt">[]): Promise<{ inserted: number; skipped: number }>;
  listContacts(listId: string, opts: { limit: number; offset: number }): Promise<{ contacts: Contact[]; total: number }>;
  getContactByToken(token: string): Promise<Contact | null>;
  setContactStatus(id: string, status: ContactStatus): Promise<void>;
  /** Every contact with this address, on every list. Used when a bounce or complaint arrives. */
  setStatusForEmail(email: string, status: ContactStatus): Promise<number>;

  // Suppressions — checked before every send, regardless of list.
  isSuppressed(email: string): Promise<boolean>;
  getSuppression(email: string): Promise<Suppression | null>;
  addSuppression(s: Suppression): Promise<void>;

  // Templates
  createTemplate(t: Omit<Template, "createdAt" | "updatedAt">): Promise<Template>;
  listTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | null>;
  updateTemplate(id: string, patch: Partial<Pick<Template, "name" | "subject" | "bodyMarkdown">>): Promise<Template | null>;
  deleteTemplate(id: string): Promise<void>;

  // Campaigns
  createCampaign(c: Omit<Campaign, "status" | "stats" | "createdAt">): Promise<Campaign>;
  listCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  deleteCampaign(id: string): Promise<void>;
  /**
   * Draft -> sending, atomically. Null when the campaign isn't a draft any more, which is how two
   * presses of Send (or two staff at once) end up as one send.
   */
  claimCampaignForSending(id: string, opts: { total: number; leaseUntil: Date; sentBy: string }): Promise<Campaign | null>;
  /** Takes over a "sending" campaign whose lease has expired. Null if another worker holds it. */
  takeOverInterruptedCampaign(id: string, leaseUntil: Date): Promise<Campaign | null>;
  /** "sending" campaigns whose lease has expired. */
  listInterruptedCampaigns(): Promise<Campaign[]>;
  renewCampaignLease(id: string, leaseUntil: Date): Promise<void>;
  bumpCampaignStats(id: string, delta: Partial<CampaignStats>): Promise<void>;
  finishCampaign(id: string, status: "sent" | "failed"): Promise<void>;

  // Sends (audit log, and the per-recipient lock)
  /** Inserts a send record. False when this contact already has one for this campaign. */
  beginSend(s: Omit<SendRecord, "at">): Promise<boolean>;
  completeSend(campaignId: string, contactId: string, outcome: { status: "sent" | "failed"; error?: string; providerId?: string }): Promise<void>;
  /**
   * After a takeover: sends left "pending" by the worker that died. Whether the provider got them
   * is unknown, so they are closed as failed rather than retried — a gap beats a duplicate.
   */
  closeOrphanedSends(campaignId: string): Promise<number>;
  listSends(campaignId: string, limit?: number): Promise<SendRecord[]>;

  // Transactional (other houses' one-to-one mail)
  addTransactional(t: Omit<TransactionalRecord, "at">): Promise<void>;
  listTransactional(limit?: number): Promise<TransactionalRecord[]>;
}
