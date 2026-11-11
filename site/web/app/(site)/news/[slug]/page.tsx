import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Placeholder } from "@/components/Placeholder";
import { getNews, getPost } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getNews()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return { title: "Post not found" };
  return { title: p.title, description: p.summary };
}

export default async function NewsPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const others = (await getNews()).filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <article className="detail narrow">
      <Link href="/news" className="back-link">← All news</Link>
      <header className="detail-head">
        <p className="eyebrow">{post.kind} · {post.date}</p>
        <h1>{post.title}</h1>
        <p className="lede">{post.summary}</p>
        <Placeholder>Placeholder post</Placeholder>
      </header>
      <div className="prose">
        {post.body.map((b, i) => (
          <div key={i}>
            {b.heading && <h2>{b.heading}</h2>}
            <p className={i === 0 ? "dropcap" : undefined}>{b.text}</p>
          </div>
        ))}
      </div>
      {others.length > 0 && <footer className="detail-more">
        <p className="eyebrow">Read next</p>
        <ul>
          {others.map((o) => <li key={o.slug}><Link href={`/news/${o.slug}`}>{o.title} →</Link></li>)}
        </ul>
      </footer>}
    </article>
  );
}
