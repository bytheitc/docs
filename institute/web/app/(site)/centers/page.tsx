import type { Metadata } from "next";
import Link from "next/link";
import { Centers } from "@/components/Centers";
import { PageHead, SectionHead } from "@/components/Heads";
import { AREAS } from "@/lib/centers";
import { getCenters } from "@/lib/data";
import { roman } from "@/lib/roman";

export const metadata: Metadata = {
  title: "The Centers",
  description: "The six centers of the Institute, each devoted to one enduring question where technology meets faith, ethics and community life.",
};

const AREA_NOTES: Record<(typeof AREAS)[number], string> = {
  Knowledge: "Centers that keep and question the tradition's learning.",
  Society: "Centers that serve the common life of communities.",
  Practice: "Centers that shape how things are taught and built.",
};

export default async function CentersPage() {
  const centers = await getCenters();
  return (
    <>
      <PageHead
        id="centers-head"
        kicker="The Centers"
        title={<>Six rooms, <em>one house.</em></>}
        lede="Each center holds one enduring question. Each is kept by a director, its fellows and the scholars who visit, and each opens its doors to the whole collective."
      />

      <section className="areas">
        {AREAS.map((a, i) => (
          <div key={a} className="area">
            <span className="area-num">{roman(i + 1)}</span>
            <h2>{a}</h2>
            <p>{AREA_NOTES[a]}</p>
            <p className="area-list">
              {centers.filter((c) => c.area === a).map((c, j) => (
                <span key={c.slug}>{j > 0 && " · "}<Link href={`/centers/${c.slug}`}><i>{c.translit}</i></Link></span>
              ))}
            </p>
          </div>
        ))}
      </section>

      <section className="centers-sec">
        <SectionHead kicker="Enter a center" title="Choose a room." />
        <Centers centers={centers} />
      </section>

      <section className="propose">
        <h2>Is a room missing?</h2>
        <p>The house is meant to grow. Any member of the collective may propose a new center.</p>
        <Link className="btn" href="/propose">Propose a center</Link>
      </section>
    </>
  );
}
