import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Placeholder } from "@/components/Placeholder";
import { getRfps } from "@/lib/data";
import { house } from "@/lib/houses";

export const metadata: Metadata = {
  title: "Requests for proposals",
  description:
    "Work the Islamic Tech Collective wants built, published as open briefs that anyone can answer.",
};

const OPEN = ["Open", "Reviewing"];

export default async function RfpsPage() {
  const all = await getRfps();
  const open = all.filter((r) => OPEN.includes(r.status));
  const closed = all.filter((r) => !OPEN.includes(r.status));

  return (
    <>
      <PageHero
        eyebrow="Requests for proposals"
        arabic="دعوة"
        gloss="daʿwa · a call"
        title={<>Work we want <em>built</em>.</>}
        lede="When the Collective decides something should exist, we write the brief in public and invite anyone to answer it. A small studio, a lone developer and a university group all read the same page and bid on the same terms."
      />

      <section className="list-page">
        <div className="prose narrow">
          <p>
            We publish briefs rather than quietly commissioning friends. It is slower, and it is the only way
            we can claim the result belongs to the community it serves. Every brief says what is needed, who
            it is for, what it pays and what it demands in return — an open licence, honest accessibility, and
            no surveillance of the people who end up using it.
          </p>
          <p>
            If you know of a need nobody has written a brief for yet,{" "}
            <Link href="/suggest">tell us what to build</Link> instead. That page is for problems; this one is
            for the briefs they turn into.
          </p>
        </div>

        <h2 className="section-title">Open briefs</h2>
        {open.length ? (
          <ul className="rfp-list">
            {open.map((r) => (
              <li key={r.slug}>
                <Link href={`/rfps/${r.slug}`} className="rfp-item">
                  <p className="rfp-meta">
                    <span className={`rfp-status s-${r.status.toLowerCase()}`}>{r.status}</span>
                    <span>{house(r.house).name}</span>
                    <span aria-hidden="true">·</span>
                    <span>Closes {r.closes}</span>
                  </p>
                  <h3>{r.title}</h3>
                  <p>{r.summary}</p>
                  <p className="rfp-terms">{r.budget} · {r.duration}</p>
                  <span className="text-link">Read the brief →</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lede">
            Nothing open right now. <Link href="/suggest">Suggest something</Link>, or{" "}
            <Link href="/join">join</Link> to hear when the next brief goes out.
          </p>
        )}

        {closed.length > 0 && (
          <>
            <h2 className="section-title">Closed</h2>
            <ul className="rfp-list closed">
              {closed.map((r) => (
                <li key={r.slug}>
                  <Link href={`/rfps/${r.slug}`} className="rfp-item">
                    <p className="rfp-meta">
                      <span className={`rfp-status s-${r.status.toLowerCase()}`}>{r.status}</span>
                      <span>{house(r.house).name}</span>
                    </p>
                    <h3>{r.title}</h3>
                    <p>{r.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="note">
          <Placeholder>Placeholder briefs</Placeholder> Budgets, dates and scope are illustrative. Nothing on
          this page is an offer until a brief is marked open with a real closing date.
        </p>
      </section>
    </>
  );
}
