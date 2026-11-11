import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NicheArch } from "@/components/Arch";
import { PageHead, SectionHead } from "@/components/Heads";
import { getCenter, getCenters } from "@/lib/data";
import { house } from "@/lib/houses";
import { roman } from "@/lib/roman";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getCenters()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCenter(slug);
  if (!c) return {};
  return { title: `${c.name} (${c.translit})`, description: c.focus };
}

export default async function CenterPage({ params }: Props) {
  const { slug } = await params;
  const c = await getCenter(slug);
  if (!c) notFound();
  const centers = await getCenters();

  const research = house("research").url;
  const i = Math.max(0, centers.findIndex((x) => x.slug === c.slug));
  const others = centers.length > 1;
  const prev = centers[(i - 1 + centers.length) % centers.length];
  const next = centers[(i + 1) % centers.length];

  return (
    <>
      <PageHead
        id={`center-${c.slug}`}
        back={{ href: "/centers", label: "All centers" }}
        arch={{ arabic: c.arabic, translit: c.translit, sense: c.sense }}
        kicker={`${c.area} · Center ${roman(i + 1)}`}
        title={c.name}
        lede={c.focus}
      />

      <section className="block">
        <SectionHead numeral="I" kicker="Mission" title="What the center is for." />
        <div className="about prose">
          {c.mission.map((p, k) => <p key={k} className={k === 0 ? "dropcap" : undefined}>{p}</p>)}
        </div>
      </section>

      <section className="block band">
        <SectionHead numeral="II" kicker="Guiding questions" title={<em>The questions it holds.</em>} />
        <ol className="questions">
          {c.questions.map((q, k) => (
            <li key={q}><span className="q-num">{roman(k + 1)}</span><p>{q}</p></li>
          ))}
        </ol>
      </section>

      <section className="block">
        <SectionHead numeral="III" kicker="Programs" title="How the work is done." />
        <div className="trio">
          {c.programs.map((p, k) => (
            <article key={p.name} className="trio-item">
              <span className="trio-num">{roman(k + 1)}</span>
              <h3>{p.name}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="block band">
        <SectionHead numeral="IV" kicker="Fellows" title="Who keeps the room." />
        <ul className="niches">
          {c.fellows.map((f, k) => (
            <li key={k} className="niche">
              <NicheArch />
              <p className="niche-role">{f.role}</p>
              <p className="niche-name">{f.name}</p>
            </li>
          ))}
        </ul>
        <p className="more-link"><Link href="/people">All the people of the Institute →</Link></p>
      </section>

      <section className="block">
        <SectionHead numeral="V" kicker="Outputs" title="What it gives back." />
        <ul className="outputs">
          {c.outputs.map((o) => (
            <li key={o.title}>
              <span className="out-kind">{o.kind}</span>
              <h3>{o.title}</h3>
              <p>{o.body}</p>
            </li>
          ))}
        </ul>
        <p className="more-link">
          <a href={research}>Read the center&rsquo;s published work at ITC Research →</a>
        </p>
      </section>

      <section className="fellowships involve">
        <SectionHead numeral="VI" kicker="Get involved" title="The door is open." light />
        <div className="columns">
          {c.involve.map((w, k) => (
            <div key={w.name} className="column">
              <span className="col-roman">{roman(k + 1)}</span>
              <h3>{w.name}</h3>
              <p>{w.body}</p>
            </div>
          ))}
        </div>
        <p className="fellow-cta">
          <a href={`mailto:${c.email}`}>Write to the center · {c.email}</a>
          <br />
          <Link href="/fellowships">Read about the fellowships →</Link>
        </p>
      </section>

      {others && (
      <nav className="pager" aria-label="Other centers">
        <Link href={`/centers/${prev.slug}`} className="pager-prev">
          <span className="pager-dir">← Previous</span>
          <span className="pager-ar" lang="ar">{prev.arabic}</span>
          <span className="pager-name"><i>{prev.translit}</i> · {prev.name}</span>
        </Link>
        <Link href={`/centers/${next.slug}`} className="pager-next">
          <span className="pager-dir">Next →</span>
          <span className="pager-ar" lang="ar">{next.arabic}</span>
          <span className="pager-name"><i>{next.translit}</i> · {next.name}</span>
        </Link>
      </nav>
      )}
    </>
  );
}
