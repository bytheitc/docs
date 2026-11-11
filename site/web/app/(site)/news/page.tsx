import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Placeholder } from "@/components/Placeholder";
import { getNews } from "@/lib/data";

export const metadata: Metadata = {
  title: "News",
  description: "Announcements, notes and open calls from the Islamic Tech Collective.",
};

export default async function NewsPage() {
  const [lead, ...rest] = await getNews();
  return (
    <>
      <PageHero
        eyebrow="News"
        title={<>Announcements &amp; <em>notes</em>.</>}
        lede="Word from the collective. Each house also publishes on its own site."
      />
      <section className="news">
        {lead ? (
          <Link href={`/news/${lead.slug}`} className="news-lead">
            <p className="news-meta">{lead.kind} · {lead.date} <Placeholder /></p>
            <h2>{lead.title}</h2>
            <p>{lead.summary}</p>
            <span className="text-link">Read →</span>
          </Link>
        ) : (
          <p className="lede">No posts yet. Check back soon.</p>
        )}
        <ul className="news-list">
          {rest.map((p) => (
            <li key={p.slug}>
              <Link href={`/news/${p.slug}`} className="news-item">
                <p className="news-meta">{p.kind} · {p.date}</p>
                <h3>{p.title}</h3>
                <p>{p.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
