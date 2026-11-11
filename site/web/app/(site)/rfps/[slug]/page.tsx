import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalForm } from "@/components/ProposalForm";
import { Placeholder } from "@/components/Placeholder";
import { getRfp, getRfps } from "@/lib/data";
import { house } from "@/lib/houses";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getRfps()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getRfp((await params).slug);
  if (!r) return { title: "Brief not found" };
  return { title: r.title, description: r.summary };
}

export default async function RfpPage({ params }: Props) {
  const rfp = await getRfp((await params).slug);
  if (!rfp) notFound();
  const accepting = rfp.status === "Open";
  const others = (await getRfps()).filter((r) => r.slug !== rfp.slug && r.status === "Open").slice(0, 2);

  return (
    <article className="detail narrow">
      <Link href="/rfps" className="back-link">← All briefs</Link>

      <header className="detail-head">
        <p className="eyebrow">
          <span className={`rfp-status s-${rfp.status.toLowerCase()}`}>{rfp.status}</span>
          <span>{house(rfp.house).name}</span>
        </p>
        <h1>{rfp.title}</h1>
        <p className="lede">{rfp.summary}</p>
        <dl className="rfp-terms-grid">
          <div><dt>Budget</dt><dd>{rfp.budget}</dd></div>
          <div><dt>Closes</dt><dd>{rfp.closes}</dd></div>
          <div><dt>Expected duration</dt><dd>{rfp.duration}</dd></div>
        </dl>
        <Placeholder>Placeholder brief</Placeholder>
      </header>

      <div className="prose">
        <h2>The need</h2>
        {rfp.need.map((p, i) => <p key={i}>{p}</p>)}

        <h2>Scope</h2>
        <ul>{rfp.scope.map((s) => <li key={s}>{s}</li>)}</ul>

        <h2>How proposals are judged</h2>
        <p>In this order.</p>
        <ol>{rfp.criteria.map((c) => <li key={c}>{c}</li>)}</ol>

        <h2>Conditions</h2>
        <p>These are not negotiable. A proposal that cannot meet them is not one we can accept.</p>
        <ul>{rfp.conditions.map((c) => <li key={c}>{c}</li>)}</ul>

        {rfp.sections?.map((s) => (
          <div key={s.heading}>
            <h2>{s.heading}</h2>
            {s.body.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        ))}
      </div>

      <section className="detail-form" aria-labelledby="propose">
        <h2 id="propose">{accepting ? "Register your interest" : "This brief is closed"}</h2>
        {accepting ? (
          <>
            <p>
              Tell us who you are and how you would approach it. We will reply either way. We do not ask for
              unpaid pitch work, and we pay for discovery before any build begins.
            </p>
            <ProposalForm rfp={rfp.slug} title={rfp.title} />
          </>
        ) : (
          <p>
            It is published here so the reasoning stays on the record.{" "}
            <Link href="/rfps">See what is open</Link>, or{" "}
            <Link href="/suggest">tell us what we should be building</Link>.
          </p>
        )}
      </section>

      {others.length > 0 && (
        <footer className="detail-more">
          <p className="eyebrow">Also open</p>
          <ul>
            {others.map((o) => <li key={o.slug}><Link href={`/rfps/${o.slug}`}>{o.title} →</Link></li>)}
          </ul>
        </footer>
      )}
    </article>
  );
}
