import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { GEOMETRY, LOCKUPS, RULES, inverseBackdrop } from "@/lib/logos";

export const metadata: Metadata = {
  title: "The logo",
  description:
    "The ITC mark is the Arabic letter nūn, set in a disc. Every house lockup, both colourways, the geometry and the rules.",
};

export default function BrandPage() {
  return (
    <>
      <PageHero
        eyebrow="Logo"
        arabic="ن"
        gloss="nūn"
        title={<>The mark is <em>a letter</em>.</>}
        lede="One mark carries every property: the Arabic letter nūn, set in a disc. Each house keeps it and adds its own name and its own colour. Everything on this page is generated from a single traced file, so there is only ever one mark."
      />

      <section className="kit">
        <div className="section-head">
          <p className="eyebrow">The mark</p>
          <h2>A letter, a dot and a circle.</h2>
          <p>
            Nūn is the fourteenth letter of the Arabic alphabet and the one that opens the
            sūra named after it. Drawn here as a single bowl and a single dot, it is about as
            little as a mark can be and still be writing rather than ornament.
          </p>
        </div>
        <div className="mark-show">
          <div className="ms-panel ms-light">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/itc-mark.svg" alt="The ITC mark: the Arabic letter nūn set in a disc" width={160} height={160} />
            <p>On light</p>
          </div>
          <div className="ms-panel ms-dark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/itc-mark.svg" alt="" aria-hidden="true" width={160} height={160} />
            <p>On dark</p>
          </div>
          <dl className="ms-specs">
            {GEOMETRY.map((g) => (
              <div key={g.label}>
                <dt>{g.label}</dt>
                <dd>{g.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="ms-note">
          Measurements are given against a disc of 100 units, so they hold at any size. The
          outline is traced from the original artwork rather than redrawn, and the wordmark is
          set in Clash Display Medium and converted to outlines — no logo file loads a font.
        </p>
      </section>

      <section className="kit">
        <div className="section-head">
          <p className="eyebrow">Lockups</p>
          <h2>One mark, {LOCKUPS.length} names.</h2>
          <p>
            Each property pairs the mark with its own name in its own colour. The left column
            is the lockup on the background that property actually uses; the right is the same
            lockup for the opposite background. Nothing else changes between them.
          </p>
        </div>
        <ul className="lockups">
          {LOCKUPS.map((l) => (
            <li key={l.id}>
              <div className="lk-head">
                <h3>{l.label}</h3>
                <p className="lk-files">
                  <a href={`/brand/${l.id}.svg`} download>
                    logo.svg
                  </a>
                  <a href={`/brand/${l.id}-inverse.svg`} download>
                    logo-inverse.svg
                  </a>
                  <a href={`/brand/${l.id}-mono.svg`} download>
                    logo-mono.svg
                  </a>
                </p>
              </div>
              <div className="lk-pair">
                <div className="lk-cell" style={{ background: l.surface }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/brand/${l.id}.svg`} alt={`The ${l.label} lockup`} height={44} />
                </div>
                <div className="lk-cell" style={{ background: inverseBackdrop(l) }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/brand/${l.id}-inverse.svg`} alt="" aria-hidden="true" height={44} />
                </div>
              </div>
              <ul className="lk-colors">
                {[
                  ["Disc", l.primary],
                  ["Nūn", l.surface],
                  ["Wordmark", l.ink],
                ].map(([role, hex]) => (
                  <li key={role}>
                    <span className="lk-chip" style={{ background: hex }} />
                    <span>{role}</span>
                    <code>{hex}</code>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="kit">
        <div className="section-head">
          <p className="eyebrow">One colour</p>
          <h2>When there is only one ink.</h2>
          <p>
            For single-colour print, etching, watermarks and anywhere the two-colour disc
            cannot go, the nūn is cut out of the disc instead of drawn on it, so whatever is
            behind the mark shows through the letter. Inline it and it takes the surrounding
            text colour.
          </p>
        </div>
        <div className="mono-row">
          <div className="mono-cell" style={{ background: "var(--parchment)", color: "var(--ink)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mark-mono.svg" alt="The mark in a single colour" width={72} height={72} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mono.svg" alt="" aria-hidden="true" height={40} />
          </div>
          <div className="mono-cell mono-photo">
            <span className="mono-masked" role="img" aria-label="The mark in white over a dark field" />
            <p>Any colour, by mask. The letter stays open.</p>
          </div>
        </div>
      </section>

      <section className="kit">
        <div className="section-head">
          <p className="eyebrow">Using it</p>
          <h2>Five rules.</h2>
        </div>
        <ol className="brand-rules">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </section>

      <section className="notice-band">
        <h2>Files</h2>
        <p>
          Every property carries the same four files: <code>itc-mark.svg</code> (the collective
          mark, identical everywhere), <code>logo.svg</code> and <code>logo-inverse.svg</code>{" "}
          (its own lockup, both colourways) and <code>mark.svg</code> (the mark alone, in its
          colours, for favicons and tight spaces).
        </p>
        <p>
          They are generated, not drawn by hand. The source is one traced mark plus a table of
          names and colours; <code>brand/generate.py</code> writes the rest. If a colour is
          wrong, it is wrong in that table, and fixing it there fixes it everywhere at once.
        </p>
        <div className="hero-ctas">
          <a className="btn" href="/itc-mark.svg" download>
            Download the mark
          </a>
          <a className="btn btn-ghost" href="/press">
            Press &amp; brand kit →
          </a>
        </div>
      </section>
    </>
  );
}
