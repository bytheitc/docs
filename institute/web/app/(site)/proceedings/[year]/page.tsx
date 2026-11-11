import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead, SectionHead } from "@/components/Heads";
import { findCenter } from "@/lib/centers";
import { house } from "@/lib/houses";
import { getCenters, getVolume, getVolumes } from "@/lib/data";
import { roman } from "@/lib/roman";

type Props = { params: Promise<{ year: string }> };

export async function generateStaticParams() {
  return (await getVolumes()).map((v) => ({ year: v.year }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  const v = await getVolume(year);
  if (!v) return {};
  return { title: `Proceedings ${v.year}: ${v.title}`, description: v.note[0] };
}

export default async function VolumePage({ params }: Props) {
  const { year } = await params;
  const v = await getVolume(year);
  if (!v) notFound();
  const centers = await getCenters();
  const research = house("research").url;

  return (
    <>
      <PageHead
        id={`volume-${v.year}`}
        back={{ href: "/proceedings", label: "All volumes" }}
        arch={{ numeral: v.roman, caption: `${v.year} · ${v.status}` }}
        kicker={`Proceedings · Volume ${v.roman}`}
        title={<>{v.year}: <em>{v.title}</em></>}
      />

      <section className="block">
        <SectionHead kicker="From the editor" title="A note on this volume." />
        <div className="about prose single">
          {v.note.map((p, k) => <p key={k} className={k === 0 ? "dropcap" : undefined}>{p}</p>)}
        </div>
      </section>

      <section className="block band">
        <SectionHead kicker="Contents" title={<em>In this volume.</em>} />
        {v.papers.length ? (
          <ol className="contents">
            {v.papers.map((p, k) => {
              const c = p.center ? findCenter(centers, p.center) : undefined;
              return (
                <li key={p.title}>
                  <span className="q-num">{roman(k + 1)}</span>
                  <div>
                    <h3>{p.title}</h3>
                    <p>
                      {p.author}
                      {c && <> · <Link href={`/centers/${c.slug}`}><i>{c.translit}</i></Link></>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="intro">Contents will be listed here after the spring colloquium.</p>
        )}
        <p className="more-link"><a href={research}>Full texts will be published at ITC Research →</a></p>
      </section>
    </>
  );
}
