import Link from "next/link";
import type { ReactNode } from "react";

interface Crumb {
  href: string;
  label: string;
}

/** Loud page header: optional breadcrumb, giant title, optional Arabic word-sign (always with transliteration). */
export function PageHead({
  title,
  kicker,
  lede,
  crumbs,
  arabic,
  children,
}: {
  title: ReactNode;
  kicker?: string;
  lede?: ReactNode;
  crumbs?: Crumb[];
  arabic?: { word: string; translit: string; sense: string };
  children?: ReactNode;
}) {
  return (
    <section className="page-head">
      {arabic && <div className="page-head-ar" lang="ar" aria-hidden="true">{arabic.word}</div>}
      {crumbs && (
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">ITC//OSS</Link>
          {crumbs.map((c) => (
            <span key={c.href}>
              <i aria-hidden="true">/</i>
              <Link href={c.href}>{c.label}</Link>
            </span>
          ))}
        </nav>
      )}
      {kicker && <p className="kicker">{kicker}</p>}
      <h1>{title}</h1>
      {(lede || arabic) && (
        <div className="page-head-foot">
          {lede && <div className="lede">{lede}</div>}
          {arabic && (
            <p className="wordsign">
              <span lang="ar" className="wordsign-ar">{arabic.word}</span>
              <span><b>{arabic.translit.toUpperCase()}</b> · {arabic.sense}</span>
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
