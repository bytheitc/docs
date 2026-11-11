import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/PageHead";
import { type Field } from "@/lib/datasets";
import { groupByName } from "@/lib/groups";
import { getDataset, getDatasets, getGroups, getPublication } from "@/lib/data";
import { house } from "@/lib/houses";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getDatasets()).map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getDataset(slug);
  if (!d) return { title: "Not in the archive" };
  return { title: `Datasheet: ${d.title}`, description: d.summary };
}

const val = (v: Field) => (v === null ? <span className="pending">pending</span> : v);

export default async function DatasheetPage({ params }: Props) {
  const { slug } = await params;
  const d = await getDataset(slug);
  if (!d) notFound();
  const pub = d.pubId ? await getPublication(d.pubId) : undefined;
  const group = groupByName(await getGroups(), d.group);

  return (
    <div className="page">
      <PageHead kicker={`Datasheet · ${d.status}`} title={d.title} lede={d.summary} crumbs={[{ href: "/datasets", label: "Datasets" }]} />

      <div className="article">
        <div className="article-main">
          <nav className="toc" aria-label="Datasheet sections">
            <p className="label-h">Contents</p>
            <ol>{d.sections.map((s, i) => <li key={s.key}><a href={`#${s.key}`}><span className="c-num">§{i + 1}</span>{s.title}</a></li>)}</ol>
          </nav>
          {d.sections.map((s, i) => (
            <section key={s.key} id={s.key} className="ds-section" aria-labelledby={`${s.key}-h`}>
              <h2 id={`${s.key}-h`}><span className="c-num">§{i + 1}</span>{s.title}</h2>
              <dl className="qa">
                {s.items.map((it, j) => (
                  <div key={j}><dt>{i + 1}.{j + 1} {it.q}</dt><dd>{val(it.a)}</dd></div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <aside className="article-side" aria-label="Dataset details">
          <dl className="meta-list">
            <div><dt>Status</dt><dd>{d.status}</dd></div>
            <div><dt>Version</dt><dd>{val(d.version)}</dd></div>
            <div><dt>Licence</dt><dd>{val(d.licence)}</dd></div>
            <div><dt>Group</dt><dd><Link href={`/groups/${group.slug}`}>{d.group}</Link></dd></div>
            {pub && <div><dt>Described in</dt><dd><Link href={`/publications/${pub.id}`}>{pub.title}</Link> <span className="mono">{pub.id}</span></dd></div>}
            <div><dt>Distribution</dt><dd><a href={house("oss").url}>ITC Open Source</a> <span className="pending">on release</span></dd></div>
            <div><dt>Contact</dt><dd><a href="mailto:data@example.org">data@example.org</a></dd></div>
          </dl>
          <p className="side-note">Placeholder datasheet. Every answer must be reviewed by the data steward before release.</p>
        </aside>
      </div>
    </div>
  );
}
