import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  /** Mono eyebrow, e.g. "02 · charter". */
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  /** Optional Arabic word-sign, always paired with its transliteration and sense. */
  arabic?: { word: string; translit: string; sense: string };
  crumbs?: { href: string; label: string }[];
  children?: ReactNode;
}

// Centered, cinematic subpage hero: the same voice as the home hero, at a quieter scale.
export function PageHero({ eyebrow, title, sub, arabic, crumbs, children }: Props) {
  return (
    <section className="page-hero">
      {crumbs && crumbs.length > 0 && (
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">ai</Link>
          {crumbs.map((c) => (
            <span key={c.href}><span aria-hidden="true"> / </span><Link href={c.href}>{c.label}</Link></span>
          ))}
        </nav>
      )}
      <p className="eyebrow">{eyebrow}</p>
      {arabic && (
        <p className="page-ar">
          <span lang="ar" dir="rtl">{arabic.word}</span>
          <span className="page-ar-gloss"><b>{arabic.translit}</b> · {arabic.sense}</span>
        </p>
      )}
      <h1>{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
      {children}
    </section>
  );
}
