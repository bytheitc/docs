// Telling subscribers that something changed.
//
// Sending must not share fate with recording. An incident is written first and the emails go after,
// so a mail provider that is down — or slow, which is likelier — cannot stop a tenant from
// publishing the update. That is the same reasoning as the rest of this service: the thing people
// need during an outage is the page, and nothing is allowed to block it.
import type { Config } from "./config.js";
import type { Mailer } from "./mail.js";
import { getStore } from "./store/index.js";
import { incidentEmail, unsubscribeToken, type NotifyKind } from "./subscribers.js";
import type { Incident, Tenant } from "./types.js";

/** Addresses are sent in small batches, so one slow provider call does not stall the rest. */
const BATCH = 20;

export interface Notifier {
  /** Fire and forget: returns once the sends are queued, never throws into the caller. */
  incident(tenant: Tenant, incident: Incident, kind: NotifyKind): void;
  /** Awaitable, for the tests and for a future "send now" admin action. */
  sendIncident(tenant: Tenant, incident: Incident, kind: NotifyKind): Promise<{ sent: number; failed: number }>;
  readonly enabled: boolean;
}

export function createNotifier(config: Config, mailer: Mailer): Notifier {
  // Without a secret we cannot issue an unsubscribe link, and mail that cannot be unsubscribed from
  // should not be sent at all.
  const enabled = Boolean(config.subscribeSecret);

  async function sendIncident(tenant: Tenant, incident: Incident, kind: NotifyKind) {
    const store = getStore();
    if (!enabled || !store) return { sent: 0, failed: 0 };

    const subscribers = await store.listConfirmedSubscribers(tenant.id);
    if (!subscribers.length) return { sent: 0, failed: 0 };

    const latest = incident.updates[incident.updates.length - 1];
    const services = incident.serviceIds.length
      ? (await store.listServices(tenant.id)).filter((s) => incident.serviceIds.includes(s.id)).map((s) => s.name)
      : [];

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < subscribers.length; i += BATCH) {
      const slice = subscribers.slice(i, i + BATCH);
      const results = await Promise.all(
        slice.map((sub) => {
          const token = unsubscribeToken(sub.id, config.subscribeSecret);
          const { subject, text } = incidentEmail({
            tenantName: tenant.name,
            pageUrl: `${config.publicUrl}/s/${tenant.id}`,
            manageUrl: `${config.publicUrl}/unsubscribe?token=${encodeURIComponent(token)}`,
            title: incident.title,
            impact: incident.impact,
            status: incident.status,
            body: latest?.body ?? "",
            services,
            kind,
            scheduled: Boolean(incident.scheduled),
          });
          return mailer.send({ to: sub.email, subject, text });
        }),
      );
      for (const r of results) r.ok ? sent++ : failed++;
    }

    console.log(`[status] incident "${incident.title}" (${kind}): ${sent} sent, ${failed} failed.`);
    return { sent, failed };
  }

  return {
    enabled,
    sendIncident,
    incident(tenant, incident, kind) {
      void sendIncident(tenant, incident, kind).catch((e) =>
        console.error(`[status] notifying about "${incident.title}" failed: ${(e as Error).message}`),
      );
    },
  };
}
