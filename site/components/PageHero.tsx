import type { ReactNode } from "react";
import { Khatam } from "@/components/Khatam";

interface Props {
  eyebrow: string;
  arabic?: string;
  /** Transliteration and/or translation shown next to the Arabic. Required when `arabic` is set. */
  gloss?: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
}

// Editorial page opener used across the Collective's interior pages.
export function PageHero({ eyebrow, arabic, gloss, title, lede, children }: Props) {
  return (
    <section className="page-hero">
      <div className="ph-text">
        <p className="eyebrow">
          {arabic && <span className="ar" lang="ar">{arabic}</span>}
          <span>{arabic && gloss ? `${gloss} · ` : ""}{eyebrow}</span>
        </p>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
      <Khatam variant="site" className="ph-mark" strokeWidth={1.2} accent="var(--gold)" />
    </section>
  );
}
