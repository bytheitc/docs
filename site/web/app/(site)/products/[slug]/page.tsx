import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewForm } from "@/components/ReviewForm";
import { getProduct, getProductReviews, getProducts } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: "Product not found" };
  return { title: p.name, description: p.tagline };
}

const STARS = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const reviews = await getProductReviews(product.slug);
  const live = product.status === "Live";

  return (
    <article className="detail narrow">
      <Link href="/products" className="back-link">← All products</Link>

      <header className="detail-head">
        <p className="eyebrow">
          <span className={`rfp-status s-${live ? "live" : "coming-soon"}`}>{product.status}</span>
        </p>
        <h1>{product.name}</h1>
        <p className="lede">{product.tagline}</p>
        {(product.repoUrl || product.liveUrl) && (
          <div className="hero-ctas">
            {product.liveUrl && <a href={product.liveUrl} className="btn" rel="noopener noreferrer" target="_blank">Open {product.name}</a>}
            {product.repoUrl && (
              <a href={product.repoUrl} className={product.liveUrl ? "btn btn-ghost" : "btn"} rel="noopener noreferrer" target="_blank">
                {product.liveUrl ? "View source" : "Download / view source"}
              </a>
            )}
          </div>
        )}
      </header>

      <div className="prose">
        {product.body.map((p, i) => <p key={i}>{p}</p>)}

        {product.features.length > 0 && (
          <>
            <h2>Features</h2>
            <ul>{product.features.map((f) => <li key={f}>{f}</li>)}</ul>
          </>
        )}
      </div>

      <section className="detail-form" aria-labelledby="reviews">
        <h2 id="reviews">Reviews</h2>
        {reviews.length ? (
          <ul className="reviews">
            {reviews.map((r) => (
              <li key={r.id} className="review">
                <p className="review-head">
                  <span className="review-stars" aria-label={`${r.rating} out of 5 stars`}>{STARS(r.rating)}</span>
                  <strong>{r.name}</strong>
                  <span className="muted">{r.date}</span>
                </p>
                <p>{r.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No reviews yet — be the first.</p>
        )}
      </section>

      <section className="detail-form" aria-labelledby="leave-review">
        <h2 id="leave-review">Leave a review</h2>
        <p>A steward reads every review before it&rsquo;s shown here.</p>
        <ReviewForm product={product.slug} />
      </section>
    </article>
  );
}
