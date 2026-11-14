import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { getProducts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Products",
  description: "What the Islamic Tech Collective has built: Hifza, Zakat and Marwa.",
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <>
      <PageHero
        eyebrow="What we've built"
        arabic="منتجات"
        gloss="muntajāt · products"
        title={<>Built by the <em>Collective</em>.</>}
        lede="Real tools, not demos. Each one runs without an account unless stated otherwise, and each one's source is open."
      />

      <section className="list-page">
        <ul className="rfp-list">
          {products.map((p) => (
            <li key={p.slug}>
              <Link href={`/products/${p.slug}`} className="rfp-item">
                <p className="rfp-meta">
                  <span className={`rfp-status s-${p.status === "Live" ? "live" : "coming-soon"}`}>{p.status}</span>
                </p>
                <h3>{p.name}</h3>
                <p>{p.summary}</p>
                <span className="text-link">Read more →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
