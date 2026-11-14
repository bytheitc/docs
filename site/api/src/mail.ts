// Transactional email. Kept deliberately identical in every service that sends, like http.ts.
//
// Providers plug in behind one interface, the way databases do in cms/api, so no vendor is baked in:
//
//   MAIL_PROVIDER   log (default) | resend | postmark | none
//   MAIL_API_KEY    the provider's key. Never logged, never sent anywhere but the provider.
//   MAIL_FROM       "ITC <hello@bytheitc.xyz>"
//   MAIL_REPLY_TO   optional, when replies should go somewhere else
//
// "log" prints the whole message to the server log and sends nothing. That is the development
// default, and it is what makes a double opt-in link clickable without a provider configured.
// "none" accepts and discards, for a deployment that must not send at all.
//
// Nothing here retries. A caller that must not lose a message stores it first and sends after.

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain text. Always required: it is what a text-only reader, and our own log, shows. */
  text: string;
  /** Optional HTML alternative. */
  html?: string;
  replyTo?: string;
}

export type MailResult = { ok: true; id?: string } | { ok: false; error: string };

export interface MailAdapter {
  readonly kind: string;
  /** Whether this adapter can actually deliver. "log" and "none" report false. */
  readonly delivers: boolean;
  send(msg: MailMessage, from: string): Promise<MailResult>;
}

export interface MailConfig {
  provider: string;
  apiKey?: string;
  from: string;
  replyTo?: string;
}

const TIMEOUT_MS = 10_000;
const MAX_SUBJECT = 200;
const MAX_BODY = 200_000;

/** A single address, with no header-injection characters. */
const ADDRESS = /^[^\s@<>,;"\r\n]+@[^\s@<>,;"\r\n]+\.[^\s@<>,;"\r\n]+$/;
export const isAddress = (v: string) => ADDRESS.test(v.trim()) && v.trim().length <= 254;

export function loadMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig {
  return {
    provider: (env.MAIL_PROVIDER ?? "log").toLowerCase(),
    apiKey: env.MAIL_API_KEY || undefined,
    from: env.MAIL_FROM || "ITC (not configured) <no-reply@localhost>",
    replyTo: env.MAIL_REPLY_TO || undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Adapters                                                           */
/* ------------------------------------------------------------------ */

const logAdapter: MailAdapter = {
  kind: "log",
  delivers: false,
  async send(msg, from) {
    console.log(
      ["", "─".repeat(72), `[mail:log] would send, but MAIL_PROVIDER is "log".`,
       `from:    ${from}`, `to:      ${msg.to}`, `subject: ${msg.subject}`,
       msg.replyTo ? `reply-to: ${msg.replyTo}` : null, "", msg.text, "─".repeat(72), ""]
        .filter((l) => l !== null).join("\n"),
    );
    return { ok: true };
  },
};

const noneAdapter: MailAdapter = {
  kind: "none",
  delivers: false,
  async send() {
    return { ok: true };
  },
};

/** Resend and Postmark both take JSON over HTTPS, so one shape covers them. */
function httpAdapter(kind: "resend" | "postmark", apiKey: string): MailAdapter {
  const endpoint = kind === "resend" ? "https://api.resend.com/emails" : "https://api.postmarkapp.com/email";
  return {
    kind,
    delivers: true,
    async send(msg, from) {
      const headers: Record<string, string> =
        kind === "resend"
          ? { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }
          : { "X-Postmark-Server-Token": apiKey, "content-type": "application/json", accept: "application/json" };
      const body =
        kind === "resend"
          ? { from, to: [msg.to], subject: msg.subject, text: msg.text, ...(msg.html ? { html: msg.html } : {}), ...(msg.replyTo ? { reply_to: msg.replyTo } : {}) }
          : { From: from, To: msg.to, Subject: msg.subject, TextBody: msg.text, ...(msg.html ? { HtmlBody: msg.html } : {}), ...(msg.replyTo ? { ReplyTo: msg.replyTo } : {}), MessageStream: "outbound" };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
          redirect: "manual",
        });
        const parsed = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          // The provider's message, never the key or the recipient's body.
          const why = typeof parsed.message === "string" ? parsed.message : typeof parsed.Message === "string" ? parsed.Message : `HTTP ${res.status}`;
          return { ok: false, error: `${kind}: ${why}` };
        }
        const id = typeof parsed.id === "string" ? parsed.id : typeof parsed.MessageID === "string" ? parsed.MessageID : undefined;
        return { ok: true, id };
      } catch (e) {
        return { ok: false, error: `${kind}: ${(e as Error).name === "TimeoutError" ? "timed out" : "could not connect"}` };
      }
    },
  };
}

export function createAdapter(config: MailConfig): MailAdapter {
  switch (config.provider) {
    case "none":
      return noneAdapter;
    case "resend":
    case "postmark":
      if (!config.apiKey) {
        console.error(`[mail] MAIL_PROVIDER="${config.provider}" but MAIL_API_KEY is not set; falling back to the log provider.`);
        return logAdapter;
      }
      return httpAdapter(config.provider, config.apiKey);
    case "log":
      return logAdapter;
    default:
      console.error(`[mail] MAIL_PROVIDER="${config.provider}" is not supported; falling back to the log provider. Supported: log, none, resend, postmark.`);
      return logAdapter;
  }
}

/* ------------------------------------------------------------------ */
/* Mailer                                                             */
/* ------------------------------------------------------------------ */

export class Mailer {
  private readonly adapter: MailAdapter;

  constructor(private readonly config: MailConfig) {
    this.adapter = createAdapter(config);
  }

  get kind(): string {
    return this.adapter.kind;
  }

  /** Whether mail actually leaves this server. False for the log and none providers. */
  get delivers(): boolean {
    return this.adapter.delivers;
  }

  /**
   * Sends one message. Never throws: the caller decides what a failure means for the visitor.
   * Subjects are flattened to one line, because a newline in a subject is a header injection.
   */
  async send(msg: MailMessage): Promise<MailResult> {
    const to = msg.to.trim();
    if (!isAddress(to)) return { ok: false, error: "That is not an email address." };

    const clean: MailMessage = {
      to,
      subject: msg.subject.replace(/[\r\n]+/g, " ").trim().slice(0, MAX_SUBJECT),
      text: msg.text.slice(0, MAX_BODY),
      ...(msg.html ? { html: msg.html.slice(0, MAX_BODY) } : {}),
      replyTo: msg.replyTo ?? this.config.replyTo,
    };
    if (clean.replyTo && !isAddress(clean.replyTo)) delete clean.replyTo;
    if (!clean.subject) return { ok: false, error: "A subject is required." };

    const result = await this.adapter.send(clean, this.config.from);
    // The address is in the log either way; the body never is, except under the log provider.
    if (!result.ok) console.error(`[mail] could not send "${clean.subject}" to ${clean.to}: ${result.error}`);
    return result;
  }
}
