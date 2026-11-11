import type { Metadata } from "next";
import Link from "next/link";
import { PageHead, SectionHead } from "@/components/Heads";
import { getFellowshipEmail, getFellowships } from "@/lib/data";

export const metadata: Metadata = {
  title: "Fellowships",
  description: "Junior Fellowships, Fellowships and Visiting Scholarships at the Institute for the Centers.",
};

const PRINCIPLES = [
  { title: "Learning in company", body: "Every fellow belongs to a center and to a cohort. No one studies alone." },
  { title: "Work carried through", body: "Each fellowship asks for something finished: a paper, a tool, a curriculum, a reflection." },
  { title: "Rooted and open", body: "Work is read against the tradition and published openly, so that others may use and correct it." },
];

export default async function FellowshipsPage() {
  const [fellowships, email] = await Promise.all([getFellowships(), getFellowshipEmail()]);
  return (
    <>
      <PageHead
        id="fellowships-head"
        arch={{ arabic: "زمالة", translit: "zamāla", sense: "fellowship, companionship" }}
        kicker="Fellowships"
        title={<>Come and <em>study with us.</em></>}
        lede="The Institute keeps three kinds of fellowship, for those beginning, those leading and those who come from the tradition's own scholarship to visit."
      />

      <section className="fellowships">
        <SectionHead kicker="Three tiers" title="Choose your door." light />
        <div className="columns">
          {fellowships.map((f) => (
            <Link key={f.slug} href={`/fellowships/${f.slug}`} className="column">
              <span className="col-roman">{f.roman}</span>
              <h3>{f.title}</h3>
              <p className="col-term">{f.term}</p>
              <p>{f.body}</p>
              <span className="col-more" aria-hidden="true">Read more →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="block">
        <SectionHead kicker="At a glance" title="The tiers, side by side." />
        <div className="table-wrap">
          <table className="compare">
            <thead>
              <tr><th scope="col">Tier</th><th scope="col">Term</th><th scope="col">For</th><th scope="col">Call opens</th></tr>
            </thead>
            <tbody>
              {fellowships.map((f) => (
                <tr key={f.slug}>
                  <th scope="row"><Link href={`/fellowships/${f.slug}`}>{f.roman} · {f.title}</Link></th>
                  <td>{f.term}</td>
                  <td>{f.forWhom}</td>
                  <td>{f.timeline[0]?.season ?? "TBA"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="block band">
        <SectionHead kicker="What binds them" title={<em>Three principles.</em>} />
        <div className="trio">
          {PRINCIPLES.map((p, k) => (
            <article key={p.title} className="trio-item">
              <span className="trio-num">{["I", "II", "III"][k]}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="propose">
        <h2>Not sure which door is yours?</h2>
        <p>Write to us with a few lines about your work, and we will help you find the right center and tier.</p>
        <a className="btn" href={`mailto:${email}`}>Enquire about fellowships</a>
      </section>
    </>
  );
}
