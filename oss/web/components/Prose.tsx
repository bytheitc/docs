import Link from "next/link";
import type { ReactNode } from "react";
import type { Block, DocSection } from "@/lib/doc";

// Tiny inline formatter: `code`, **bold**, [label](href). Nothing else.
const TOKEN = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export function Inline({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter(Boolean);
  return (
    <>
      {parts.map((p, i): ReactNode => {
        if (p.startsWith("`") && p.endsWith("`")) return <code key={i}>{p.slice(1, -1)}</code>;
        if (p.startsWith("**") && p.endsWith("**")) return <b key={i}>{p.slice(2, -2)}</b>;
        const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p);
        if (m) {
          const [, label, href] = m;
          return href.startsWith("/") ? (
            <Link key={i} href={href}>{label}</Link>
          ) : (
            <a key={i} href={href} rel="noreferrer">{label}</a>
          );
        }
        return p;
      })}
    </>
  );
}

export function CodeBlock({ code, lang, title }: { code: string; lang: string; title?: string }) {
  return (
    <figure className="code">
      <figcaption>
        <span>{title ?? lang}</span>
        <span className="code-lang">{lang}</span>
      </figcaption>
      <pre tabIndex={0}>
        <code>{code}</code>
      </pre>
    </figure>
  );
}

function BlockView({ block }: { block: Block }) {
  if (typeof block === "string") return <p><Inline text={block} /></p>;
  if ("list" in block) return <ul className="prose-list">{block.list.map((t, i) => <li key={i}><Inline text={t} /></li>)}</ul>;
  if ("steps" in block) return <ol className="prose-steps">{block.steps.map((t, i) => <li key={i}><Inline text={t} /></li>)}</ol>;
  if ("code" in block) return <CodeBlock code={block.code} lang={block.lang} title={block.title} />;
  if ("note" in block) return <p className={`note note-${block.tone ?? "mint"}`}><Inline text={block.note} /></p>;
  return (
    <dl className="defs">
      {block.defs.map((d) => (
        <div key={d.k}><dt>{d.k}</dt><dd><Inline text={d.v} /></dd></div>
      ))}
    </dl>
  );
}

/** Long-form document: sticky table of contents + numbered sections in a bordered grid. */
export function Doc({ sections, tocLabel = "ON THIS PAGE" }: { sections: DocSection[]; tocLabel?: string }) {
  return (
    <div className="doc">
      <nav className="doc-toc" aria-label={tocLabel}>
        <span className="doc-toc-label">{tocLabel}</span>
        <ol>
          {sections.map((s) => (
            <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>
          ))}
        </ol>
      </nav>
      <div className="doc-body">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="doc-sec">
            <h2>{s.title}</h2>
            {s.blocks.map((b, i) => <BlockView key={i} block={b} />)}
          </section>
        ))}
      </div>
    </div>
  );
}
