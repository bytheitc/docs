import type { Metadata } from "next";
import Link from "next/link";
import { CardArch } from "@/components/Arch";
import { PageHead } from "@/components/Heads";
import { house } from "@/lib/houses";
import { getVolumes } from "@/lib/data";

export const metadata: Metadata = {
  title: "Proceedings",
  description: "The yearly proceedings of the Institute for the Centers, published openly with ITC Research.",
};

export default async function ProceedingsPage() {
  const volumes = await getVolumes();
  return (
    <>
      <PageHead
        id="proceedings-head"
        arch={{ arabic: "أعمال", translit: "aʿmāl", sense: "works, proceedings" }}
        kicker="Proceedings"
        title={<>The year, <em>in writing.</em></>}
        lede="Each summer the Institute gathers the year's papers, reflections and records into a single volume, published openly with ITC Research."
      />

      <section className="block">
        <ul className="volumes">
          {volumes.map((v) => (
            <li key={v.year}>
              <Link href={`/proceedings/${v.year}`} className="volume">
                <div className="center-arch">
                  <CardArch id={`vol-${v.year}`} />
                  <div className="center-arch-text">
                    <span className="vol-roman">{v.roman}</span>
                    <span className="center-tr">{v.year}</span>
                  </div>
                </div>
                <div className="center-body">
                  <p className="center-area">{v.status}</p>
                  <h2>Volume {v.roman}: <em>{v.title}</em></h2>
                  <p>{v.papers.length ? `${v.papers.length} contributions` : "Contents to be announced"}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p className="more-link"><a href={house("research").url}>Browse all published work at ITC Research →</a></p>
      </section>
    </>
  );
}
