import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead, SectionHead } from "@/components/Heads";
import { getFellowship, getFellowshipEmail, getFellowships } from "@/lib/data";
import { roman } from "@/lib/roman";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getFellowships()).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFellowship(slug);
  if (!f) return {};
  return { title: f.title, description: f.body };
}

export default async function FellowshipPage({ params }: Props) {
  const { slug } = await params;
  const f = await getFellowship(slug);
  if (!f) notFound();
  const [all, email] = await Promise.all([getFellowships(), getFellowshipEmail()]);
  const others = all.filter((o) => o.slug !== f.slug);

  return (
    <>
      <PageHead
        id={`fellowship-${f.slug}`}
        back={{ href: "/fellowships", label: "All fellowships" }}
        arch={{ numeral: f.roman, caption: `${f.term} · ${f.forWhom}` }}
        kicker={`Fellowship tier ${f.roman}`}
        title={f.title}
        lede={f.body}
      />

      <section className="block">
        <div className="pair">
          <div>
            <SectionHead numeral="I" kicker="Eligibility" title="Who may apply." />
            <ul className="diamonds">{f.eligibility.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
          <div>
            <SectionHead numeral="II" kicker="What is offered" title="What the Institute gives." />
            <ul className="diamonds">{f.offered.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="block band">
        <SectionHead numeral="III" kicker="Expectations" title={<em>What is asked in return.</em>} />
        <ol className="questions">
          {f.expectations.map((e, k) => (
            <li key={e}><span className="q-num">{roman(k + 1)}</span><p>{e}</p></li>
          ))}
        </ol>
      </section>

      <section className="block">
        <SectionHead numeral="IV" kicker="How to apply" title="The way in." />
        <ol className="steps">
          {f.apply.map((s, k) => (
            <li key={s}><span className="step-num">{roman(k + 1)}</span><p>{s}</p></li>
          ))}
        </ol>
        <p className="center-cta"><a className="btn" href={`mailto:${email}?subject=${encodeURIComponent(f.title)}`}>Write to apply</a></p>
      </section>

      <section className="year">
        <SectionHead numeral="V" kicker="Timeline" title="Through the seasons." />
        <ol className="seasons">
          {f.timeline.map((t) => (
            <li key={t.season}>
              <span className="season">{t.season}</span>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
            </li>
          ))}
        </ol>
        <p className="fine">Exact dates are announced each year. <Link href="/calendar">See the calendar →</Link></p>
      </section>

      {others.length > 0 && (
      <nav className="pager" aria-label="Other fellowships">
        {others.map((o, k) => (
          <Link key={o.slug} href={`/fellowships/${o.slug}`} className={k === 0 ? "pager-prev" : "pager-next"}>
            <span className="pager-dir">Tier {o.roman}</span>
            <span className="pager-roman">{o.roman}</span>
            <span className="pager-name">{o.title} · {o.term}</span>
          </Link>
        ))}
      </nav>
      )}
    </>
  );
}
