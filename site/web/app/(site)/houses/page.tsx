import type { Metadata } from "next";
import Link from "next/link";
import { Khatam } from "@/components/Khatam";
import { PageHero } from "@/components/PageHero";
import { house } from "@/lib/houses";
import { profile } from "@/lib/houseProfiles";
import { getHouseProfiles } from "@/lib/data";

export const metadata: Metadata = {
  title: "The five houses",
  description: "AI, Engineering, the Institute, Open Source and Research: what each house does and how they work together.",
};

export default async function HousesPage() {
  const HOUSE_PROFILES = await getHouseProfiles();
  return (
    <>
      <PageHero
        eyebrow="The five houses"
        title={<>One collective, <em>five ways in</em>.</>}
        lede="Each house keeps its own rhythm, its own people and its own voice. Below, each one introduces itself in its own type, as it does on its own site."
      >
        <nav className="jump" aria-label="Jump to a house">
          {HOUSE_PROFILES.map((p) => <a key={p.id} href={`#${p.id}`}>{house(p.id).name}</a>)}
        </nav>
      </PageHero>

      <section className="house-list">
        {HOUSE_PROFILES.map((p) => {
          const h = house(p.id);
          return (
            <article key={p.id} id={p.id} className={`house-row hr-${p.id}`}>
              <div className="hr-sign">
                <Khatam variant={p.id} className="hr-mark" strokeWidth={4} />
                <span className="hr-ar" lang="ar">{h.arabic}</span>
                <span className="hr-gloss">{h.transliteration} · {h.sense}</span>
              </div>
              <div className="hr-main">
                <p className="eyebrow">{p.label}</p>
                <h2 className="hr-title">{p.title}</h2>
                <p className="hr-desc">{p.desc}</p>
                <div className="hr-cols">
                  <div>
                    <h3>Focus</h3>
                    <ul>{p.focus.map((f) => <li key={f}>{f}</li>)}</ul>
                  </div>
                  <div>
                    <h3>Works with</h3>
                    <ul>
                      {p.collaborates.map((c) => (
                        <li key={c.with}><a href={`#${c.with}`}>{profile(HOUSE_PROFILES, c.with)?.label ?? house(c.with).name}</a>, which {c.how}.</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <a className="btn btn-small" href={h.url}>Visit {p.label} →</a>
              </div>
            </article>
          );
        })}
      </section>

      <section className="collab">
        <div className="section-head">
          <p className="eyebrow">How they collaborate</p>
          <h2>Separate houses, one courtyard.</h2>
          <p>The houses are not departments that hand work over a wall. They share people, gatherings and a council.</p>
        </div>
        <ol className="collab-steps">
          <li><h3>Shared principles</h3><p>Every house answers to the same four principles. A project in one house can be reviewed against them by members of any other.</p></li>
          <li><h3>Shared gatherings</h3><p>The Annual Majlis brings all five together. Smaller gatherings, like the Reading Circle and Open Studio, are co-hosted across houses on purpose.</p></li>
          <li><h3>Shared council</h3><p>The stewards of every house sit on the collective council and decide cross-house questions by consultation.</p></li>
          <li><h3>Shared commons</h3><p>What one house builds, the others can use. Open Source holds the code, Research holds the findings and the Institute teaches both.</p></li>
        </ol>
        <p className="center"><Link href="/events" className="text-link">See the gatherings →</Link></p>
      </section>
    </>
  );
}
