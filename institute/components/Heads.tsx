import Link from "next/link";
import type { ReactNode } from "react";
import { Arch } from "@/components/Arch";
import { Khatam } from "@/components/Khatam";

export function Ornament() {
  return (
    <div className="ornament" aria-hidden="true">
      <span />
      <Khatam variant="institute" className="orn-mark" strokeWidth={4} accent="var(--gold)" />
      <span />
    </div>
  );
}

type ArchContent =
  | { arabic: string; translit: string; sense: string }
  | { numeral: string; caption: string };

/** The head of an inner page: a small arch, a ✦ kicker, a display title and a lede. */
export function PageHead({
  id,
  kicker,
  title,
  lede,
  arch,
  back,
}: {
  id: string;
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
  arch?: ArchContent;
  back?: { href: string; label: string };
}) {
  return (
    <section className="page-head">
      {back && (
        <p className="back">
          <Link href={back.href}>← {back.label}</Link>
        </p>
      )}
      {arch && (
        <figure className="page-arch">
          <Arch id={id} size="sm">
            {"arabic" in arch ? (
              <>
                <span className="arch-ar" lang="ar">{arch.arabic}</span>
                <span className="arch-tr">{arch.translit}</span>
              </>
            ) : (
              <span className="arch-num">{arch.numeral}</span>
            )}
          </Arch>
          <figcaption className="gloss">
            {"arabic" in arch ? (
              <>
                <i>{arch.translit}</i> · {arch.sense}
              </>
            ) : (
              arch.caption
            )}
          </figcaption>
        </figure>
      )}
      <p className="sec-kicker">{kicker}</p>
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      <Ornament />
    </section>
  );
}

/** A centered section head with ✦ kicker, optionally numbered in roman numerals. */
export function SectionHead({ numeral, kicker, title, light, id }: { numeral?: string; kicker: string; title: ReactNode; light?: boolean; id?: string }) {
  return (
    <header className={light ? "sec-head light" : "sec-head"}>
      <p className="sec-kicker">{numeral ? `${numeral} · ${kicker}` : kicker}</p>
      <h2 id={id}>{title}</h2>
    </header>
  );
}
