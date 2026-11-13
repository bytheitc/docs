import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { getPrinciples } from "@/lib/data";
import { house } from "@/lib/houses";

export const metadata: Metadata = {
  // No `title` here: the root layout's default is "ITC Health", and setting it again would run it
  // through the "%s · ITC Health" template and read "ITC Health · ITC Health".
  description:
    "Health technology built for the places that cannot pay for it: offline-first tools, records that belong to the person they describe, and health data that is never for sale.",
};

export default async function HomePage() {
  const principles = await getPrinciples();
  const self = house("health");

  return (
    <>
      <PageHead
        kicker="Islamic Tech Collective"
        title={<>Care is mostly logistics.<br />So is the software.</>}
        lede={
          <p>
            Most health technology is built for the places that can pay for it. We are building for
            everywhere else — offline first, in the languages people speak at home, and without
            treating the person in front of us as a source of data.
          </p>
        }
        arabic={{ word: self.arabic, translit: self.transliteration, sense: self.sense }}
      />

      <div className="wrap">
        <div className="lead">
          <p>
            This house is at the beginning. There are no programmes to announce and no results to
            report. What there is, is an argument for why this work is worth doing and a set of
            commitments we intend to be held to.
          </p>
          <p className="cta">
            <Link className="btn" href="/idea">Read the idea</Link>
            <a className="btn ghost" href={house("oss").url}>See how we build</a>
          </p>
        </div>

        <h2 className="section-title">What we hold ourselves to</h2>
        {principles.length ? (
          <ul className="principles">
            {principles.map((p) => (
              <li key={p.id} id={p.id}>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty" style={{ paddingBottom: 56 }}>
            The principles couldn&rsquo;t be loaded just now.
          </p>
        )}
      </div>
    </>
  );
}
