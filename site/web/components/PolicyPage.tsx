import Link from "next/link";
import type { PolicySection } from "@/lib/policies";

// Shared layout for the draft policy pages linked from every house's footer.
export function PolicyPage({ title, intro, sections }: { title: string; intro: string; sections: PolicySection[] }) {
  return (
    <article className="detail narrow policy">
      <header className="detail-head">
        <p className="eyebrow">Policy · Draft</p>
        <h1>{title}</h1>
        <div className="draft-banner" role="note">
          <strong>Draft, not yet in effect.</strong> This text is a placeholder written in plain language and needs
          legal review before launch. It applies to all six Islamic Tech Collective sites.
        </div>
        <p className="lede">{intro}</p>
      </header>
      <nav className="policy-toc" aria-label="On this page">
        <ol>
          {sections.map((s, i) => <li key={s.heading}><a href={`#s${i + 1}`}>{s.heading}</a></li>)}
        </ol>
      </nav>
      <div className="prose">
        {sections.map((s, i) => (
          <section key={s.heading} id={`s${i + 1}`}>
            <h2><span className="policy-n">{i + 1}.</span> {s.heading}</h2>
            {s.body.map((p) => <p key={p.slice(0, 32)}>{p}</p>)}
          </section>
        ))}
      </div>
      <footer className="detail-more">
        <p>Questions about this policy? Write to <a href="mailto:privacy@bytheitc.xyz" className="text-link">privacy@bytheitc.xyz</a> or use the <Link href="/contact" className="text-link">contact page</Link>.</p>
        <p className="fine-note">Last updated: not yet published.</p>
      </footer>
    </article>
  );
}
