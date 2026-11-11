import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { PENDING } from "@/lib/model-cards";
import { getModelCards } from "@/lib/data";

export const metadata: Metadata = {
  title: "Model cards",
  description: "One transparency document per model, always in the same shape: intended use, out-of-scope use, data, evaluation, limitations and contact.",
};

const TEMPLATE = ["intended use", "out-of-scope use", "data", "evaluation", "limitations", "contact"];

export default async function ModelCardsPage() {
  const MODEL_CARDS = await getModelCards();
  return (
    <>
      <PageHero
        eyebrow="model cards · transparency"
        title={<>Every model, <span className="grad">on the record.</span></>}
        sub="Each model we release ships with a card in the same six sections, so you can compare them and hold us to them. Fields we can't fill honestly yet say pending."
        crumbs={[{ href: "/model-cards", label: "model cards" }]}
      >
        <ol className="template-row" aria-label="Sections in every model card">
          {TEMPLATE.map((t, i) => <li key={t}><span>0{i + 1}</span>{t}</li>)}
        </ol>
      </PageHero>
      <div className="wrap">
        <div className="cards cards-3">
          {MODEL_CARDS.map((m) => {
            const pending = m.evaluation.filter((e) => e.result === PENDING).length;
            return (
              <Link key={m.slug} href={`/model-cards/${m.slug}`} className="card card-link">
                <div className="card-top"><span className="tag">{m.kind.split(" ").slice(-1)[0]}</span><span className="spec">{m.facts.find((f) => f.label === "status")?.value}</span></div>
                <h3 className="mono-title">{m.name}</h3>
                <p>{m.summary}</p>
                <dl>
                  <div><dt>project</dt><dd>{m.project}</dd></div>
                  <div><dt>eval results</dt><dd>{pending} pending</dd></div>
                </dl>
                <span className="card-more">open card <span aria-hidden="true">→</span></span>
              </Link>
            );
          })}
        </div>
        <p className="placeholder-note">{"// placeholder cards. Pending values are completed from real runs at release."}</p>
      </div>
    </>
  );
}
