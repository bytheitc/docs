import type { Metadata } from "next";
import { Khatam } from "@/components/Khatam";
import { PageHero } from "@/components/PageHero";
import { HOUSES, type HouseId } from "@/lib/houses";
import { getPressPage } from "@/lib/data";

export const metadata: Metadata = {
  title: "Press & brand kit",
  description: "The khātam mark for each house, the master palette and the typography of the Islamic Tech Collective.",
};

// Brand constants (BRAND.md). They mirror globals.css and the brand system, so they stay in code.
const PALETTE = [
  { token: "ink", hex: "#14201B", source: "Iron-gall ink" },
  { token: "parchment", hex: "#F3EDE0", source: "Manuscript paper" },
  { token: "emerald", hex: "#0F5C4D", source: "Iznik green" },
  { token: "gold", hex: "#B8862F", source: "Illumination gold leaf" },
  { token: "lapis", hex: "#2F4BD6", source: "Lapis lazuli pigment" },
  { token: "pomegranate", hex: "#7A1F2B", source: "Madder red" },
  { token: "saffron", hex: "#E35D0F", source: "Saffron, Iznik tomato-red" },
  { token: "turquoise", hex: "#2EC4B6", source: "Persian turquoise tile" },
  { token: "mint", hex: "#C6F432", source: "Modern signal color (Open Source only)" },
];

const TYPE: { id: HouseId; display: string; body: string; cssVar: string; sample: string }[] = [
  { id: "site", display: "Fraunces", body: "Manrope", cssVar: "var(--display)", sample: "Technology, built with intention." },
  { id: "ai", display: "Space Grotesk", body: "JetBrains Mono", cssVar: "var(--font-space-grotesk), sans-serif", sample: "Intelligence, with intention." },
  { id: "engineering", display: "IBM Plex Sans", body: "IBM Plex Mono", cssVar: "var(--font-plex-sans), sans-serif", sample: "Build it right." },
  { id: "institute", display: "Cormorant Garamond", body: "Work Sans", cssVar: "var(--font-cormorant), serif", sample: "A home for the centers." },
  { id: "oss", display: "Archivo Black", body: "Space Mono", cssVar: "var(--font-archivo-black), sans-serif", sample: "FORK IT. FIX IT." },
  { id: "research", display: "Newsreader", body: "Inter Tight", cssVar: "var(--font-newsreader), serif", sample: "Careful questions." },
];

const name = (id: HouseId) => HOUSES.find((h) => h.id === id)!.name;

export default async function PressPage() {
  const { email, centers, donts, guidelines } = await getPressPage();
  const center = (id: HouseId) => centers.find((c) => c.house === id)?.text;
  return (
    <>
      <PageHero
        eyebrow="Press & brand kit"
        title={<>One star, <em>six centers</em>.</>}
        lede={`Everything you need to write about or represent the Collective accurately. For interviews and high-resolution files, write to ${email}.`}
      />

      <section className="kit">
        <div className="section-head">
          <p className="eyebrow">The mark</p>
          <h2>The khātam.</h2>
          <p>An eight-pointed star of two overlapping squares, drawn on a 100×100 grid with compass and straightedge. The outer star never changes; only the center does. Clear space is half the mark&rsquo;s width. Minimum size is 20px.</p>
        </div>
        <ul className="marks">
          {HOUSES.map((h) => (
            <li key={h.id} className={`mark-card mc-${h.id}`}>
              <Khatam variant={h.id} className="mc-svg" strokeWidth={4} role="img" aria-label={`${h.name} mark`} aria-hidden={undefined} />
              <p className="mc-name">{h.name}</p>
              <p className="mc-ar"><span lang="ar">{h.arabic}</span> {h.transliteration} · {h.sense}</p>
              {center(h.id) && <p className="mc-center">{center(h.id)}</p>}
            </li>
          ))}
        </ul>
        {donts.length > 0 && <div className="dont">
          <h3>Please don&rsquo;t</h3>
          <ul>{donts.map((d) => <li key={d}>{d}</li>)}</ul>
        </div>}
      </section>

      <section className="kit">
        <div className="section-head">
          <p className="eyebrow">Palette</p>
          <h2>From manuscript and tile.</h2>
          <p>Every house color comes from one master palette drawn from illumination and tilework. Gold is for accents only, never body text.</p>
        </div>
        <ul className="swatches">
          {PALETTE.map((c) => (
            <li key={c.token}>
              <span className="sw-chip" style={{ background: c.hex }} />
              <span className="sw-token">{c.token}</span>
              <code>{c.hex}</code>
              <span className="sw-source">{c.source}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="kit">
        <div className="section-head">
          <p className="eyebrow">Typography</p>
          <h2>Each house speaks in its own type.</h2>
          <p>A house&rsquo;s display face is never used in another house. The Collective site is the one exception, so it can introduce each house in its own voice. Arabic word-signs are set in Reem Kufi everywhere.</p>
        </div>
        <ul className="type-list">
          {TYPE.map((t) => (
            <li key={t.id}>
              <p className="tl-meta"><strong>{name(t.id)}</strong> · {t.display} / {t.body}</p>
              <p className="tl-sample" style={{ fontFamily: t.cssVar }}>{t.sample}</p>
            </li>
          ))}
          <li>
            <p className="tl-meta"><strong>Word-signs</strong> · Reem Kufi</p>
            <p className="tl-sample tl-ar"><span lang="ar">جماعة · ذكاء · هندسة · معهد · مشاع · بحث</span></p>
          </li>
        </ul>
      </section>

      <section id="guidelines" className="notice-band">
        <h2>Brand guidelines</h2>
        {guidelines && <p>{guidelines}</p>}
        <div className="hero-ctas">
          {/* TODO: link to the published guidelines PDF once it exists. The logo files are at /brand. */}
          <a className="btn" href="/brand">The logo and its files</a>
          <a className="btn btn-ghost" href={`mailto:${email}?subject=Brand%20guidelines%20request`}>Request the guidelines</a>
          <a className="btn btn-ghost" href={`mailto:${email}`}>Press enquiries →</a>
        </div>
      </section>
    </>
  );
}
