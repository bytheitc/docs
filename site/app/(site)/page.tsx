import Link from "next/link";
import { Khatam, KHATAM_POINTS } from "@/components/Khatam";
import { JoinForm } from "@/components/JoinForm";
import { house } from "@/lib/houses";
import { getEvents, getHouseProfiles, getPrinciples } from "@/lib/data";

function Rosette() {
  return (
    <svg viewBox="0 0 400 400" className="rosette" aria-hidden="true">
      <defs>
        <polygon id="khatam" points={KHATAM_POINTS} />
      </defs>
      <g>
        <circle cx="200" cy="200" r="190" fill="none" stroke="var(--gold)" strokeWidth="1" />
        <circle cx="200" cy="200" r="178" fill="none" stroke="var(--gold)" strokeWidth="0.5" strokeDasharray="2 6" />
      </g>
      <g className="ring ring-mid">
        <use href="#khatam" transform="translate(40 40) scale(3.2)" fill="none" stroke="var(--emerald)" strokeWidth="0.6" />
        <use href="#khatam" transform="rotate(22.5 200 200) translate(40 40) scale(3.2)" fill="none" stroke="var(--emerald)" strokeWidth="0.6" />
      </g>
      <g className="ring ring-inner">
        <use href="#khatam" transform="translate(110 110) scale(1.8)" fill="var(--emerald)" opacity="0.92" />
        <use href="#khatam" transform="translate(140 140) scale(1.2)" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
      </g>
      <circle cx="200" cy="200" r="14" fill="var(--gold)" />
    </svg>
  );
}

export default async function Home() {
  const self = house("site");
  const [TILES, PRINCIPLES, events] = await Promise.all([getHouseProfiles(), getPrinciples(), getEvents()]);
  const GATHERINGS = events.slice(0, 3);
  return (
    <>
      <div className="home">
        <section className="hero">
          <div>
            <p className="eyebrow">
              <span className="ar" lang="ar">{self.arabic}</span>
              <span>{self.transliteration} · the collective</span>
            </p>
            <h1>Technology, built with <em>intention</em>, in service of people.</h1>
            <p className="lede">
              The Islamic Tech Collective brings together engineers, researchers, scholars and builders who believe
              how we build matters as much as what we build. Five houses, one shared trust.
            </p>
            <div className="hero-ctas">
              <Link href="/join" className="btn">Join the Collective</Link>
              <a href="#houses" className="btn btn-ghost">Explore the houses →</a>
            </div>
          </div>
          <div className="hero-art"><Rosette /></div>
        </section>

        <section id="houses" className="houses">
          <div className="section-head">
            <p className="eyebrow">Five houses</p>
            <h2>One collective, five ways in.</h2>
            <p>Each house has its own focus, its own people and its own voice. They share one root, and the star at the center of every one of them.</p>
            <p><Link href="/houses" className="text-link">How the houses work together →</Link></p>
          </div>
          <div className="bento">
            {TILES.map((t) => {
              const h = house(t.id);
              return (
                <a key={t.id} className={`tile tile-${t.id}`} href={h.url}>
                  <Khatam variant={t.id} className="tile-mark" strokeWidth={4} />
                  <span className="tile-ar" lang="ar">{h.arabic}</span>
                  <span className="tile-label">{t.label}</span>
                  <span className="tile-title">{t.title}</span>
                  <span className="tile-desc">{t.desc}</span>
                  <span className="tile-go">Enter →</span>
                </a>
              );
            })}
          </div>
        </section>

        <section id="principles" className="principles">
          <div className="section-head light">
            <p className="eyebrow">What we hold to</p>
            <h2>Four words we build by.</h2>
            <p><Link href="/about#principles" className="text-link light">Read the principles in depth →</Link></p>
          </div>
          <ol className="principle-list">
            {PRINCIPLES.map((p) => (
              <li key={p.name}>
                <span className="p-ar" lang="ar">{p.ar}</span>
                <h3>{p.name} <small>{p.en}</small></h3>
                <p>{p.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="gatherings" className="gatherings">
          <div className="section-head">
            <p className="eyebrow">Gatherings</p>
            <h2>Where the collective meets.</h2>
            <p><Link href="/events" className="text-link">All gatherings →</Link></p>
          </div>
          <div className="events">
            {GATHERINGS.map((g) => (
              <Link key={g.slug} href={`/events/${g.slug}`} className="event">
                <div className="ev-date"><span className="ev-day">—</span><span className="ev-mon">Date TBA</span></div>
                <div>
                  <p className="ev-house">{g.hostLabel}</p>
                  <h3>{g.title}</h3>
                  <p>{g.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="join" className="join">
          <Khatam variant="site" className="join-mark" strokeWidth={2} />
          <h2>There is a place for you here.</h2>
          <p>Whether you write code, write papers, teach or just care about how technology shapes our lives, come build with us.</p>
          <JoinForm />
          <p className="join-more">Volunteering, partnering or giving? <Link href="/join" className="text-link">See every way to take part →</Link></p>
        </section>
      </div>
    </>
  );
}
