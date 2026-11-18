// Turns a template's Markdown source into a responsive HTML email (inline styles — email clients
// ignore <style> blocks and class names) and a plain-text alternative, with merge-tag
// substitution and the required unsubscribe footer. Hand-rolled, like everything else in this
// codebase: no markdown/email-template dependency.
//
// Supported source syntax, deliberately small:
//   # Heading / ## Heading     -> <h1>/<h2>
//   blank line                -> paragraph break
//   - item                    -> a bullet list
//   [Button label](url)       -> a button, when it is the whole line
//   **bold**, *italic*, [text](url)  -> inline formatting, anywhere else
//   {{field}}                 -> a merge tag, substituted from the contact's CSV columns
//   {{field|fallback}}        -> the same, with text used when the contact has no value for it

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// {{ key }} or {{ key | fallback text }}. The fallback can't contain "}".
const MERGE_TAG = /\{\{\s*([a-z0-9_]+)\s*(?:\|([^}]*))?\}\}/gi;

export function applyMergeTags(source: string, fields: Record<string, string>): string {
  return source.replace(MERGE_TAG, (_m, key: string, fallback: string | undefined) => {
    const value = (fields[key.toLowerCase()] ?? "").trim();
    return value || (fallback ?? "").trim();
  });
}

export interface MergeTagUse {
  key: string;
  /** True when every use of this key carries a fallback, so a missing value can't leave a gap. */
  hasFallback: boolean;
}

/** The merge tags a source uses, deduplicated, keys lower-cased. */
export function mergeTagsIn(...sources: string[]): MergeTagUse[] {
  const seen = new Map<string, boolean>();
  for (const source of sources) {
    for (const m of source.matchAll(MERGE_TAG)) {
      const key = m[1].toLowerCase();
      const fallback = m[2] !== undefined && m[2].trim() !== "";
      seen.set(key, (seen.get(key) ?? true) && fallback);
    }
  }
  return [...seen].map(([key, hasFallback]) => ({ key, hasFallback }));
}

function inlineHtml(line: string): string {
  let out = escapeHtml(line);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, text: string, href: string) => `<a href="${href}" style="color:#2563eb;text-decoration:underline;">${text}</a>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  return out;
}

function inlineText(line: string): string {
  return line
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
}

const BUTTON_LINE = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;

export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Campaign mail always passes unsubscribeUrl, which adds the footer. Transactional mail (a magic
 * link, a receipt) omits it: it isn't marketing, and an unsubscribe link there would be misleading.
 */
export function renderEmail(bodyMarkdown: string, opts: { unsubscribeUrl?: string } = {}): RenderedEmail {
  const lines = bodyMarkdown.replace(/\r\n/g, "\n").split("\n");
  const htmlBlocks: string[] = [];
  const textBlocks: string[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    htmlBlocks.push(`<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">${para.map(inlineHtml).join("<br/>")}</p>`);
    textBlocks.push(para.map(inlineText).join("\n"));
    para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    htmlBlocks.push(`<ul style="margin:0 0 16px;padding-left:20px;">${list.map((i) => `<li style="font-size:15px;line-height:1.6;color:#1f2937;margin-bottom:4px;">${inlineHtml(i)}</li>`).join("")}</ul>`);
    textBlocks.push(list.map((i) => `- ${inlineText(i)}`).join("\n"));
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const buttonMatch = BUTTON_LINE.exec(line);
    if (!line) { flushPara(); flushList(); continue; }
    if (buttonMatch) {
      flushPara(); flushList();
      const [, label, href] = buttonMatch;
      htmlBlocks.push(`<p style="margin:0 0 20px;"><a href="${href}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:999px;">${escapeHtml(label)}</a></p>`);
      textBlocks.push(`${label}: ${href}`);
      continue;
    }
    if (line.startsWith("## ")) {
      flushPara(); flushList();
      htmlBlocks.push(`<h2 style="margin:0 0 12px;font-size:19px;line-height:1.3;color:#111827;font-weight:700;">${inlineHtml(line.slice(3))}</h2>`);
      textBlocks.push(inlineText(line.slice(3)).toUpperCase());
      continue;
    }
    if (line.startsWith("# ")) {
      flushPara(); flushList();
      htmlBlocks.push(`<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#111827;font-weight:700;">${inlineHtml(line.slice(2))}</h1>`);
      textBlocks.push(inlineText(line.slice(2)).toUpperCase());
      continue;
    }
    if (line.startsWith("- ")) {
      flushPara();
      list.push(line.slice(2));
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();

  const footer = opts.unsubscribeUrl
    ? `          <tr><td style="padding:0 32px 24px;border-top:1px solid #e5e7eb;">
            <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">
              You're receiving this because you're on an ITC mailing list.
              <a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
            </p>
          </td></tr>
`
    : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px 16px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:12px;" cellpadding="0" cellspacing="0">
          <tr><td style="padding:32px;">
            ${htmlBlocks.join("\n            ")}
          </td></tr>
${footer}        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = opts.unsubscribeUrl ? `${textBlocks.join("\n\n")}\n\n---\nUnsubscribe: ${opts.unsubscribeUrl}` : textBlocks.join("\n\n");
  return { html, text };
}
