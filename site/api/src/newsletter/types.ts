// The newsletter's data model. It lives in this house's own database (itc_site), because the
// Collective runs the newsletter; the CMS holds content, not people's addresses.
//
// Double opt-in: an address is only ever "pending" until the person clicks the link we email them.
// Nothing is sent to a pending address except that one confirmation.

/** House lists a person can choose. "site" is the Collective's own. */
export type ListId = string;

export type SubscriberStatus = "pending" | "confirmed" | "unsubscribed";

export interface Subscriber {
  /** Lower-cased address. One record per address. */
  email: string;
  status: SubscriberStatus;
  /** Which lists they asked for. Empty is not allowed while confirmed. */
  lists: ListId[];
  /**
   * SHA-256 of the confirmation token. The token itself is only ever in the email we send,
   * so a leaked database cannot be used to confirm anyone.
   */
  confirmTokenHash?: string;
  confirmExpiresAt?: Date;
  /** SHA-256 of the permanent unsubscribe token, which every newsletter links. */
  unsubscribeTokenHash: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  unsubscribedAt?: Date;
  /** How many confirmation emails we have sent, so a bad actor can't use us to mail someone. */
  confirmSends: number;
  lastConfirmSentAt?: Date;
}

export interface NewsletterStore {
  readonly kind: string;
  ping(): Promise<void>;
  close(): Promise<void>;

  get(email: string): Promise<Subscriber | null>;
  /** Insert or update by address, leaving a confirmed subscriber confirmed. */
  put(sub: Subscriber): Promise<void>;
  patch(email: string, patch: Partial<Subscriber>): Promise<void>;
  byConfirmTokenHash(hash: string): Promise<Subscriber | null>;
  byUnsubscribeTokenHash(hash: string): Promise<Subscriber | null>;
  /** Confirmed subscribers of a list, for a future send. */
  listConfirmed(list?: ListId): Promise<Subscriber[]>;
  counts(): Promise<{ pending: number; confirmed: number; unsubscribed: number }>;
}
