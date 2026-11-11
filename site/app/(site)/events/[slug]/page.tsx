import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Khatam } from "@/components/Khatam";
import { getEvent, getEvents } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getEvents()).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) return { title: "Gathering not found" };
  return { title: e.title, description: e.summary };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const e = await getEvent(slug);
  if (!e) notFound();

  return (
    <article className="detail">
      <Link href="/events" className="back-link">← All gatherings</Link>
      <header className="detail-head">
        <p className="eyebrow">{e.hostLabel} · {e.cadence}</p>
        <h1>{e.title}</h1>
        <p className="lede">{e.summary}</p>
      </header>
      <div className="detail-grid">
        <div className="prose">
          {e.body.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
          {e.agenda.length > 0 && <>
            <h2>Shape of the day</h2>
            <ul>{e.agenda.map((a) => <li key={a}>{a}</li>)}</ul>
          </>}
          <h2>Who it’s for</h2>
          <p>{e.forWhom}</p>
        </div>
        <aside className="facts" aria-label="Details">
          <Khatam variant={e.hosts[0]} className="facts-mark" strokeWidth={4} accent="var(--gold)" />
          <dl>
            <div><dt>Date</dt><dd>{e.date}</dd></div>
            <div><dt>Where</dt><dd>{e.location}</dd></div>
            <div><dt>Format</dt><dd>{e.format}</dd></div>
            <div><dt>Hosted by</dt><dd>{e.hostLabel}</dd></div>
          </dl>
          <Link href="/join" className="btn btn-small">Hear when dates are set</Link>
        </aside>
      </div>
    </article>
  );
}
