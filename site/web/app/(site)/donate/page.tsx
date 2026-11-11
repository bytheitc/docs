import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { getGivingPage } from "@/lib/data";

export const metadata: Metadata = {
  title: "Support the work",
  description: "How support for the Islamic Tech Collective is used, and the ways to give.",
};

export default async function DonatePage() {
  const { uses: USES, options: OPTIONS, email, note, notice } = await getGivingPage();
  return (
    <>
      <PageHero
        eyebrow="Support the work"
        title={<>Every gift is held as an <em>amānah</em>.</>}
        lede="Support keeps our gatherings open, our code maintained and our research free to read. We account for what we receive and report on how it is used."
      />

      <section className="prose-section">
        <div className="prose-aside"><p className="eyebrow">How support is used</p></div>
        <ol className="uses">
          {USES.map((u, i) => (
            <li key={u.title}>
              <span className="way-n">{String(i + 1).padStart(2, "0")}</span>
              <div><h2>{u.title}</h2><p>{u.body}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="give">
        <div className="section-head">
          <p className="eyebrow">Ways to give</p>
          <h2>Choose what fits.</h2>
        </div>
        <div className="give-grid">
          {OPTIONS.map((o) => (
            <article key={o.title} className="give-card">
              <h3>{o.title}</h3>
              <p>{o.body}</p>
            </article>
          ))}
        </div>
        <div className="give-cta">
          {/* TODO: replace with the real giving platform link once the entity and payment provider are set up. */}
          <a className="btn" href={`mailto:${email}?subject=Supporting%20the%20Collective`}>Talk to us about giving</a>
          {note && <p className="fine-note">{note}</p>}
        </div>
      </section>

      <section className="notice-band">
        <h2>A note on zakat and tax status</h2>
        {notice.map((p) => <p key={p.slice(0, 32)}>{p}</p>)}
        <p><Link href="/faq" className="text-link">More questions →</Link></p>
      </section>
    </>
  );
}
