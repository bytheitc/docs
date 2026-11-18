// "Can this deployment send real mail yet?" — every check a person has to fix outside the code
// (a provider account, DNS records, public URLs, secrets), answered from the live configuration
// and real DNS lookups, so the dashboard can show what's left instead of a guess.
import { Resolver } from "node:dns/promises";
import type { Config } from "./config.js";
import type { Mailer } from "./mail.js";

export type CheckStatus = "ok" | "warn" | "fail";

export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface Readiness {
  ready: boolean;
  fromDomain: string | null;
  checks: Check[];
}

const PLACEHOLDER_DOMAINS = /(^|\.)(example\.(org|com|net)|localhost|invalid|test)$/i;

export function domainOf(from: string): string | null {
  const m = /@([^\s>]+)>?\s*$/.exec(from.trim());
  return m ? m[1].toLowerCase() : null;
}

const isPublicHttps = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(u.hostname);
  } catch {
    return false;
  }
};

async function txt(resolver: Resolver, name: string): Promise<string[] | null> {
  try {
    return (await resolver.resolveTxt(name)).map((parts) => parts.join(""));
  } catch {
    return null;
  }
}

export async function checkReadiness(config: Config, mailer: Mailer): Promise<Readiness> {
  const checks: Check[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail: string) => checks.push({ id, label, status, detail });

  // 1. A provider that actually delivers.
  if (mailer.delivers) add("provider", "Mail provider", "ok", `Sending through ${mailer.kind}.`);
  else add("provider", "Mail provider", "fail", `MAIL_PROVIDER is "${mailer.kind}", so nothing leaves this server. Set MAIL_PROVIDER to resend or postmark, and MAIL_API_KEY to that account's key.`);

  // 2. A real From address.
  const domain = domainOf(mailer.from);
  if (!domain) add("from", "From address", "fail", `MAIL_FROM ("${mailer.from}") has no address in it. Use the form: ITC <hello@your-domain>.`);
  else if (PLACEHOLDER_DOMAINS.test(domain)) add("from", "From address", "fail", `MAIL_FROM uses ${domain}, a placeholder. Use an address on the collective's own domain.`);
  else add("from", "From address", "ok", `Sending as ${mailer.from}.`);

  // 3. DNS on the sending domain. Real lookups, with a short timeout.
  if (domain && !PLACEHOLDER_DOMAINS.test(domain)) {
    const resolver = new Resolver({ timeout: 3000, tries: 1 });
    const [rootTxt, sendTxt, dmarcTxt, resendDkim] = await Promise.all([
      txt(resolver, domain),
      txt(resolver, `send.${domain}`), // Resend puts its SPF record on the send. subdomain
      txt(resolver, `_dmarc.${domain}`),
      mailer.kind === "resend" ? txt(resolver, `resend._domainkey.${domain}`) : Promise.resolve(null),
    ]);

    const spf = [...(rootTxt ?? []), ...(sendTxt ?? [])].find((r) => r.toLowerCase().startsWith("v=spf1"));
    add("spf", "SPF record", spf ? "ok" : "fail",
      spf ? `Found: ${spf}` : `No SPF record on ${domain} (or send.${domain}). Add the SPF TXT record your provider's domain page shows.`);

    if (mailer.kind === "resend") {
      add("dkim", "DKIM record", resendDkim?.length ? "ok" : "fail",
        resendDkim?.length ? `Found resend._domainkey.${domain}.` : `No DKIM key at resend._domainkey.${domain}. Add it from Resend → Domains, then press Verify there.`);
    } else {
      add("dkim", "DKIM record", "warn", mailer.delivers
        ? `${mailer.kind}'s DKIM selector varies per account, so it can't be checked from here. Confirm the domain shows as verified in ${mailer.kind}.`
        : "Checked once a provider is chosen.");
    }

    const dmarc = (dmarcTxt ?? []).find((r) => r.toLowerCase().startsWith("v=dmarc1"));
    add("dmarc", "DMARC record", dmarc ? "ok" : "fail",
      dmarc ? `Found: ${dmarc}` : `No DMARC record at _dmarc.${domain}. Gmail and Yahoo require one for bulk mail. Start with: v=DMARC1; p=none; rua=mailto:dmarc@${domain}`);
  }

  // 4. Public HTTPS links. One-click unsubscribe must be HTTPS, and the provider must reach the webhooks.
  add("web-url", "Unsubscribe links", isPublicHttps(config.web.url) ? "ok" : "fail",
    isPublicHttps(config.web.url) ? `Links point at ${config.web.url}.` : `WEB_URL is ${config.web.url}. Mail links need email/web's public https address, or one-click unsubscribe won't work.`);

  add("webhooks", "Bounce & complaint webhooks",
    config.mail.webhookSecret && isPublicHttps(config.publicUrl) ? "ok" : "fail",
    !config.mail.webhookSecret
      ? "MAIL_WEBHOOK_SECRET is not set, so bounces and complaints can't be received. Without them we keep mailing dead addresses."
      : !isPublicHttps(config.publicUrl)
        ? `API_PUBLIC_URL is ${config.publicUrl}. The provider needs this api's public https address to post bounces to.`
        : `Point the provider's webhook at ${config.publicUrl}/webhooks/${mailer.kind === "postmark" ? "postmark" : "resend"} (bounces and complaints).`);

  // 5. Informational: whether other houses can send through here yet.
  add("services", "Transactional senders", config.serviceKeys.size ? "ok" : "warn",
    config.serviceKeys.size
      ? `Allowed: ${[...new Set(config.serviceKeys.values())].join(", ")}.`
      : "EMAIL_SERVICE_KEYS is empty, so no other house can send magic links or confirmations through here yet.");

  return { ready: checks.every((c) => c.status !== "fail"), fromDomain: domain, checks };
}
