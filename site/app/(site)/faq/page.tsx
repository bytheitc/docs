import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { getFaq } from "@/lib/data";

export const metadata: Metadata = {
  title: "Questions",
  description: "Frequently asked questions about the Islamic Tech Collective.",
};

export default async function FaqPage() {
  const FAQ = await getFaq();
  return (
    <>
      <PageHero
        eyebrow="Questions"
        title={<>Asked, and <em>answered</em>.</>}
        lede="If your question isn’t here, write to us. We will add the good ones."
      />
      <section className="faq">
        {FAQ.map((f, i) => (
          <details key={f.slug} className="faq-item" open={i === 0}>
            <summary><span>{f.q}</span></summary>
            <div className="faq-a"><p>{f.a}{f.link && <> <Link href={f.link.href} className="text-link">{f.link.label}</Link></>}</p></div>
          </details>
        ))}
        <p className="center faq-more"><Link href="/contact" className="btn btn-ghost">Ask us something else →</Link></p>
      </section>
    </>
  );
}
