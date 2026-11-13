import type { ReactNode } from "react";

export interface ArabicNote {
  word: string;
  translit: string;
  sense: string;
}

/**
 * The top of a page. The Arabic is there for meaning, never decoration, and always carries its
 * transliteration and sense (BRAND.md, rule 4).
 */
export function PageHead({
  kicker,
  title,
  lede,
  arabic,
}: {
  kicker?: string;
  title: ReactNode;
  lede?: ReactNode;
  arabic?: ArabicNote;
}) {
  return (
    <header className="page-head">
      <div className="wrap">
        {kicker && <p className="kicker">{kicker}</p>}
        <h1>{title}</h1>
        {lede && <div className="lede">{lede}</div>}
        {arabic && (
          <p className="arabic-note">
            <span className="word" lang="ar">{arabic.word}</span>
            <span className="gloss">
              <b>{arabic.translit}</b> — {arabic.sense}
            </span>
          </p>
        )}
      </div>
    </header>
  );
}
