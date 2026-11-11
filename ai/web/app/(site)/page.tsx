import Link from "next/link";
import { Demo } from "@/components/Demo";
import { house } from "@/lib/houses";
import { getHome, getPrinciples } from "@/lib/data";

export default async function AIHome() {
  const self = house("ai");
  const [{ focus: FOCUS, lab: LAB }, PRINCIPLES] = await Promise.all([getHome(), getPrinciples()]);
  return (
    <>
        <section className="hero">
          <p className="hero-ar" lang="ar" aria-label={`${self.transliteration}, ${self.sense}`}>{self.arabic}</p>
          <h1>Intelligence,<br /><span className="grad">with intention.</span></h1>
          <p className="hero-sub">We build, evaluate and govern AI systems on the conviction that capability without conscience is not progress.</p>
          <div className="hero-meta">
            <span><b>{self.transliteration}</b> · {self.sense}</span>
            <span className="dot" />
            <span>AI at the Islamic Tech Collective</span>
          </div>
          <a href="#demo" className="scroll-cue" aria-label="Scroll down"><span /></a>
        </section>

        <section id="demo" className="demo-wrap">
          <Demo />
          <p className="demo-caption">
            A model that knows its limits is a model you can trust. Every system we ship is tuned to say{" "}
            <em>&quot;I don&apos;t know&quot;</em> and to point people back to qualified people.
          </p>
        </section>

        {FOCUS.length > 0 && (
        <section id="focus" className="focus">
          <header className="sec-head"><span className="sec-num">01</span><h2>Where we focus</h2></header>
          <div className="cards">
            {FOCUS.map((f) => (
              <Link key={f.title} href={f.href} className="card card-link">
                <div className="card-top"><span className="tag">{f.tag}</span><span className="spec">ongoing</span></div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                <dl>
                  <div><dt>output</dt><dd>{f.output}</dd></div>
                  <div><dt>house</dt><dd>{f.with}</dd></div>
                </dl>
                <span className="card-more">explore <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
        </section>
        )}

        <section id="charter" className="charter">
          <header className="sec-head"><span className="sec-num">02</span><h2>The charter</h2></header>
          <ol className="charter-list">
            {PRINCIPLES.map((c) => (
              <li key={c.id}>
                <span className="c-k">{c.k}</span>
                <div><h3><Link href={`/charter#${c.id}`}>{c.title}</Link></h3><p>{c.summary}</p></div>
              </li>
            ))}
          </ol>
          <p className="sec-more"><Link href="/charter" className="text-link">Read the full charter, and how it&apos;s enforced <span aria-hidden="true">→</span></Link></p>
        </section>

        {LAB.length > 0 && (
        <section id="lab" className="lab">
          <header className="sec-head"><span className="sec-num">03</span><h2>From the lab</h2></header>
          <div className="lab-grid">
            {LAB.map((l) => (
              <Link key={l.title} className="lab-item" href={l.href}>
                <span className="lab-type">{l.type}</span>
                <span className="lab-title">{l.title}</span>
                <span className="lab-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
          <p className="placeholder-note">{"// placeholder entries. Replace with real releases."} <Link href="/projects" className="text-link">all projects →</Link></p>
        </section>
        )}

        <section id="collab" className="collab">
          <h2>Build with us.</h2>
          <p>Researchers, engineers, scholars and community partners: we&apos;re looking for people who want AI to be worthy of trust.</p>
          <div className="cta-row">
            <Link className="cta" href="/collaborate">open calls <span aria-hidden="true">→</span></Link>
            <a className="cta cta-quiet" href="mailto:ai@example.org">ai@example.org</a>
          </div>
        </section>
    </>
  );
}
