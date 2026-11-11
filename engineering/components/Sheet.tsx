import Link from "next/link";
import type { ReactNode } from "react";
import type { Block, Chip as ChipKind } from "@/lib/content";

// Drawing-sheet primitives shared by every page in this house.

export interface Crumb { label: string; href?: string }

export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const all: Crumb[] = [{ label: "ITC" }, { label: "ENG", href: "/" }, ...trail];
  return (
    <nav className="crumbs mono" aria-label="Breadcrumb">
      <ol>
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={`${c.label}-${i}`}>
              {c.href && !last ? <Link href={c.href}>{c.label.toUpperCase()}</Link> : (
                <span aria-current={last ? "page" : undefined}>{c.label.toUpperCase()}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Chip({ kind, children }: { kind: ChipKind; children?: ReactNode }) {
  return <span className={`status ${kind}`}>{children ?? kind}</span>;
}

export interface PageHeadProps {
  trail: Crumb[];
  sheet: string;
  title: ReactNode;
  lede?: ReactNode;
  word?: { arabic: string; transliteration: string; gloss: string };
  block?: [string, ReactNode][];
}

/** Title block for a sheet: breadcrumbs, sheet number, title, optional Arabic word-sign and a spec strip. */
export function PageHead({ trail, sheet, title, lede, word, block }: PageHeadProps) {
  return (
    <header className="page-head grid">
      <div className="ph-copy">
        <Breadcrumbs trail={trail} />
        <p className="kicker mono">{sheet}</p>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {word && (
        <div className="ph-word">
          <span className="ph-ar" lang="ar" dir="rtl">{word.arabic}</span>
          <span className="mono ph-tr">{word.transliteration}</span>
          <span className="ph-gloss">{word.gloss}</span>
        </div>
      )}
      {block && block.length > 0 && (
        <dl className="title-block">
          {block.map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      )}
    </header>
  );
}

/** A numbered section, e.g. "02.3 Interfaces". */
export function Section({ id, num, title, note, children, className }: { id: string; num: string; title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`sec${className ? ` ${className}` : ""}`} aria-labelledby={`${id}-h`}>
      <header className="sec-head">
        <span className="mono">{num}</span>
        <h2 id={`${id}-h`}>{title}</h2>
        {note && <p className="sec-note mono">{note}</p>}
      </header>
      {children}
    </section>
  );
}

/** Long-form blocks, set to a readable measure. */
export function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "p":
            return <p key={i}>{b.text}</p>;
          case "list":
            return b.ordered
              ? <ol key={i} className="pl ordered">{b.items.map((t) => <li key={t}>{t}</li>)}</ol>
              : <ul key={i} className="pl">{b.items.map((t) => <li key={t}>{t}</li>)}</ul>;
          case "note":
            return (
              <aside key={i} className="note">
                <p className="note-k mono">{b.label ?? "Note"}</p>
                <p>{b.text}</p>
              </aside>
            );
          case "code":
            return (
              <figure key={i} className="code">
                {b.caption && <figcaption className="mono">{b.caption}</figcaption>}
                <pre tabIndex={0}><code>{b.text}</code></pre>
              </figure>
            );
          case "spec":
            return (
              <dl key={i} className="spec-dl">
                {b.rows.map(([k, v]) => (
                  <div key={k}><dt className="mono">{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            );
        }
      })}
    </div>
  );
}

/** Previous / next sheet links at the foot of a long-form page. */
export function Pager({ prev, next }: { prev?: { href: string; label: string }; next?: { href: string; label: string } }) {
  if (!prev && !next) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      {prev ? <Link href={prev.href} className="pg prev"><span className="mono">← Previous</span>{prev.label}</Link> : <span />}
      {next ? <Link href={next.href} className="pg next"><span className="mono">Next →</span>{next.label}</Link> : <span />}
    </nav>
  );
}
