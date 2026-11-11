import Link from "next/link";
import { Arch } from "@/components/Arch";
import { Centers } from "@/components/Centers";
import { Ornament, SectionHead } from "@/components/Heads";
import { house } from "@/lib/houses";
import { getCenters, getFellowships, getYear } from "@/lib/data";

export default async function InstituteHome() {
  const self = house("institute");
  const [centers, fellowships, year] = await Promise.all([getCenters(), getFellowships(), getYear()]);
  return (
    <>
      <section className="hero">
        <Arch id="hero">
          <span className="arch-ar" lang="ar">{self.arabic}</span>
          <span className="arch-tr">{self.transliteration}</span>
        </Arch>
        <h1>A home for the centers<br /><em>that carry the work forward.</em></h1>
        <Ornament />
      </section>

      <section id="about" className="about">
        <p className="dropcap">
          The Institute is the scholarly heart of the Islamic Tech Collective. It houses a family of centers, each devoted
          to one enduring question where technology meets faith, ethics and community life.
        </p>
        <p>
          Where the other houses build and ship, the Institute takes the long view. It convenes fellows and scholars,
          keeps a calendar of study and makes sure the collective&rsquo;s work stays rooted in the tradition it serves.
          Like the <i>madrasas</i> and <i>bayt al-ḥikmas</i> before it, it is a place for learning in company.
        </p>
      </section>

      <section id="centers" className="centers-sec">
        <SectionHead kicker="The Centers" title="Six rooms, one house." />
        <Centers centers={centers} />
        <p className="more-link"><Link href="/centers">All the centers →</Link></p>
      </section>

      <section id="fellowships" className="fellowships">
        <SectionHead kicker="Fellowships" title="Come and study with us." light />
        <div className="columns">
          {fellowships.map((f) => (
            <Link key={f.slug} href={`/fellowships/${f.slug}`} className="column">
              <span className="col-roman">{f.roman}</span>
              <h3>{f.title}</h3>
              <p className="col-term">{f.term}</p>
              <p>{f.body}</p>
            </Link>
          ))}
        </div>
        <p className="fellow-cta"><Link href="/fellowships">Read about the fellowships →</Link></p>
      </section>

      <section id="year" className="year">
        <SectionHead kicker="The Year at the Institute" title="A rhythm of study." />
        <ol className="seasons">
          {year.map((y) => (
            <li key={y.slug}>
              <Link href={`/calendar#${y.slug}`}>
                <span className="season">{y.season}</span>
                <h3>{y.title}</h3>
                <p>{y.body}</p>
              </Link>
            </li>
          ))}
        </ol>
        <p className="more-link"><Link href="/calendar">The full calendar →</Link></p>
      </section>

      <section className="propose">
        <h2>Have a question worth a center?</h2>
        <p>Proposals for new centers are welcomed from any member of the collective.</p>
        <Link className="btn" href="/propose">Propose a center</Link>
      </section>
    </>
  );
}
