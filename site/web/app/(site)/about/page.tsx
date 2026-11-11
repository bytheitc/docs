import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { house } from "@/lib/houses";
import { getPrinciples } from "@/lib/data";

export const metadata: Metadata = {
  title: "About",
  description: "The story, mission and four principles of the Islamic Tech Collective.",
};

export default async function AboutPage() {
  const self = house("site");
  const PRINCIPLES = await getPrinciples();
  return (
    <>
      <PageHero
        eyebrow="About the collective"
        arabic={self.arabic}
        gloss={self.transliteration}
        title={<>A gathering of people who build, <em>together</em>.</>}
        lede="The Islamic Tech Collective is a home for engineers, researchers, scholars and builders who want their work to carry their values with it."
      />

      <section className="prose-section">
        <div className="prose-aside"><p className="eyebrow">Our story</p></div>
        <div className="prose">
          <p className="dropcap">Many of us came to this work the same way: alone. A developer maintaining a library for her community in the evenings. A researcher asking questions no lab would fund. A teacher trying to explain new technology to students who would one day build it.</p>
          <p>The work was good, but scattered. Nobody reviewed it, few people saw it, and much of it stopped when one person ran out of time. The Collective began as a simple idea: put that work under one roof, hold it to shared principles, and make sure it outlives any single pair of hands.</p>
          <p>We organised ourselves as five houses so that each kind of work can keep its own rhythm and its own voice, while answering to one trust.</p>
        </div>
      </section>

      <section className="prose-section">
        <div className="prose-aside"><p className="eyebrow">Mission</p></div>
        <div className="prose">
          <p className="pull">To build technology with intention, in service of people, and to raise the builders who will carry that work forward.</p>
          <p>In practice that means three commitments: to make useful things and maintain them; to publish what we learn; and to welcome and teach the people who come after us.</p>
        </div>
      </section>

      <section className="name-band" aria-labelledby="name-h">
        <div className="name-inner">
          <p className="eyebrow">What the name means</p>
          <h2 id="name-h">Three words, each chosen with care.</h2>
          <dl className="name-grid">
            <div>
              <dt>Islamic</dt>
              <dd>Our principles come from the Islamic tradition, and so does much of our vocabulary. The Collective is open to anyone who shares the work and respects the values it is built on.</dd>
            </div>
            <div>
              <dt>Tech</dt>
              <dd>Software, models, research and the craft around them. We use the word broadly: a well-written curriculum is technology too.</dd>
            </div>
            <div>
              <dt>Collective</dt>
              <dd>
                In Arabic, <span lang="ar" className="inline-ar">{self.arabic}</span> <em>{self.transliteration}</em>: a community gathered around a shared center. That center is drawn as the solid dot at the heart of our star.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="principles" className="principles-deep">
        <div className="section-head">
          <p className="eyebrow">The four principles</p>
          <h2>Four words we build by.</h2>
          <p>Each principle is a word from the tradition, glossed in English. Each one has a practice attached, because a value that changes nothing is only decoration.</p>
        </div>
        <ol className="pd-list">
          {PRINCIPLES.map((p, i) => (
            <li key={p.slug} id={p.slug} className="pd-item">
              <div className="pd-head">
                <span className="pd-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="pd-ar" lang="ar">{p.ar}</span>
                <h3>{p.name} <small>{p.en}</small></h3>
                <p className="pd-root">{p.root}</p>
              </div>
              <div className="pd-body">
                {p.long.map((para) => <p key={para.slice(0, 24)}>{para}</p>)}
                <h4>In practice</h4>
                <ul>{p.practice.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            </li>
          ))}
        </ol>
        <p className="fine-note">Arabic terms and root glosses to be reviewed by a native speaker and a scholar before launch.</p>
      </section>

      <section className="cta-band">
        <h2>Find your house.</h2>
        <p>Five ways into the same work.</p>
        <div className="hero-ctas center">
          <Link href="/houses" className="btn">Meet the houses</Link>
          <Link href="/team" className="btn btn-ghost">Who stewards it →</Link>
        </div>
      </section>
    </>
  );
}
