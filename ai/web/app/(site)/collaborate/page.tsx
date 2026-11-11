import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { InterestForm } from "@/components/InterestForm";
import { getCalls, getInterests } from "@/lib/data";

export const metadata: Metadata = {
  title: "Collaborate",
  description: "Open calls for researchers, scholars, engineers and community partners who want AI to be worthy of trust.",
};

export default async function CollaboratePage() {
  const [CALLS, interests] = await Promise.all([getCalls(), getInterests()]);
  return (
    <>
      <PageHero
        eyebrow="collaborate · open calls"
        title={<>Build it <span className="grad">with us.</span></>}
        sub="We need people who can build, people who can measure, and people who can tell us when we are wrong. Pick the call that fits, or tell us about one we haven't thought of."
        crumbs={[{ href: "/collaborate", label: "collaborate" }]}
      />
      <div className="wrap">
        <div className="cards">
          {CALLS.map((c) => (
            <article key={c.id} id={c.id} className="card call">
              <div className="card-top"><span className="tag">{c.id}</span><span className="spec">open</span></div>
              <h3>{c.title}</h3>
              <p>{c.lede}</p>
              <div className="call-cols">
                <div><h4>you&apos;d</h4><ul>{c.youd.map((x) => <li key={x}>{x}</li>)}</ul></div>
                <div><h4>you bring</h4><ul>{c.bring.map((x) => <li key={x}>{x}</li>)}</ul></div>
              </div>
            </article>
          ))}
        </div>

        <section className="form-wrap" aria-labelledby="interest-h">
          <header className="sec-head"><span className="sec-num">→</span><h2 id="interest-h">Register interest</h2></header>
          <p className="form-intro">We&apos;ll ask only for what we need to reply, and keep it only as long as that takes.</p>
          <InterestForm calls={CALLS.map((c) => ({ id: c.id, title: c.title }))} interests={interests} />
        </section>
      </div>
    </>
  );
}
