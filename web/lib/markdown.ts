// Markdown to HTML, the same on the server (pages) and in the browser (the editor's preview), so
// what an editor sees is exactly what readers get.
//
// Pages are written by staff and stored in a public repository, so the output is treated as
// untrusted: raw HTML is shown as text, never rendered, and links and images may only use http(s),
// mailto, a relative path or an anchor. That is what lets the page put the result straight into the DOM.
import { Marked, type Tokens } from "marked";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdownLang from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

for (const [name, lang] of Object.entries({ bash, css, diff, go, javascript, json, markdown: markdownLang, python, sql, typescript, xml, yaml })) hljs.registerLanguage(name, lang);
const ALIASES: Record<string, string> = { sh: "bash", shell: "bash", zsh: "bash", console: "bash", ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", md: "markdown", html: "xml", py: "python", yml: "yaml" };

/** Heading ids. Must match docs/api's slugify, so search results land on the right section. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safeUrl = (href: string) => (/^(https?:|mailto:|\/|#|\.\.?\/)/i.test(href.trim()) || !/^[a-z][a-z0-9+.-]*:/i.test(href.trim()) ? href : "#");

const CALLOUTS: Record<string, string> = { NOTE: "Note", TIP: "Tip", IMPORTANT: "Important", WARNING: "Warning", CAUTION: "Caution" };

export function renderMarkdown(md: string): string {
  const seen = new Map<string, number>();
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      html(token: Tokens.HTML | Tokens.Tag) {
        return escapeHtml(token.text);
      },
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, { tokens, depth, text }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        if (depth === 2 || depth === 3) {
          const base = slugify(text.replace(/[`*_]/g, "")) || "section";
          const n = seen.get(base) ?? 0;
          seen.set(base, n + 1);
          const id = n ? `${base}-${n}` : base;
          return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inner}</h${depth}>\n`;
        }
        return `<h${depth}>${inner}</h${depth}>\n`;
      },
      code({ text, lang }: Tokens.Code) {
        const raw = (lang ?? "").trim().split(/\s+/)[0].toLowerCase();
        const name = ALIASES[raw] ?? raw;
        const body = name && hljs.getLanguage(name) ? hljs.highlight(text, { language: name, ignoreIllegals: true }).value : escapeHtml(text);
        const label = raw ? `<span class="code-lang">${escapeHtml(raw)}</span>` : "";
        return `<div class="code">${label}<pre><code class="hljs">${body}</code></pre></div>\n`;
      },
      blockquote(this: { parser: { parse: (t: Tokens.Generic[]) => string } }, { tokens }: Tokens.Blockquote) {
        const html = this.parser.parse(tokens);
        const m = /^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/.exec(html);
        if (!m) return `<blockquote>${html}</blockquote>\n`;
        const kind = m[1];
        const rest = html.slice(m[0].length).replace(/^<\/p>\s*/, "");
        return `<aside class="callout callout-${kind.toLowerCase()}"><p class="callout-title">${CALLOUTS[kind]}</p>${rest.startsWith("<") ? rest : `<p>${rest}`}</aside>\n`;
      },
      link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, { href, title, tokens }: Tokens.Link) {
        const url = safeUrl(href);
        const external = /^https?:/i.test(url);
        return `<a href="${escapeHtml(url)}"${title ? ` title="${escapeHtml(title)}"` : ""}${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${this.parser.parseInline(tokens)}</a>`;
      },
      image({ href, title, text }: Tokens.Image) {
        const url = safeUrl(href);
        return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}"${title ? ` title="${escapeHtml(title)}"` : ""} loading="lazy">`;
      },
      table(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Table) {
        const cell = (c: Tokens.TableCell, tag: "th" | "td") => `<${tag}${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</${tag}>`;
        // A table written with a blank header row (| | |) is a list of pairs: no empty header bar.
        const blankHead = token.header.every((c) => !c.text.trim());
        const head = blankHead ? "" : `<thead><tr>${token.header.map((c) => cell(c, "th")).join("")}</tr></thead>`;
        const rows = token.rows.map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`).join("");
        return `<div class="table-wrap"><table>${head}<tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });
  return marked.parse(md, { async: false }) as string;
}
