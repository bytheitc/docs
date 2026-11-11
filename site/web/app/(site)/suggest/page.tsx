import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { SuggestionForm } from "@/components/SuggestionForm";
import { getSuggestPage } from "@/lib/data";

export const metadata: Metadata = {
  title: "Tell us what to build",
  description:
    "Describe something software could carry for your masjid, school, charity or family, and the Islamic Tech Collective will read it.",
};

export default async function SuggestPage() {
  const copy = await getSuggestPage();

  return (
    <>
      <PageHero
        eyebrow="Suggestions"
        arabic="مشورة"
        gloss="mashūra · counsel"
        title={<>Tell us what to <em>build</em>.</>}
        lede={copy.intro}
      />

      <section className="suggest">
        <div className="suggest-grid">
          <div className="prose">
            <h2>What to tell us</h2>
            <p>
              You do not need a solution, a specification or any technical knowledge. The problem is the
              useful part. These questions are only here to help you describe one.
            </p>
            <ul className="prompt-list">
              {copy.prompts.map((p) => (
                <li key={p.title}>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </li>
              ))}
            </ul>

            <h2>What we won&rsquo;t take on</h2>
            <p>Said plainly, so nobody spends an evening writing something we were never going to build.</p>
            <ul>{copy.outOfScope.map((o) => <li key={o}>{o}</li>)}</ul>
          </div>

          <aside className="suggest-side">
            <h2 className="section-title">What happens next</h2>
            <ol className="steps">
              {copy.steps.map((s) => (
                <li key={s.title}>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
            <p className="note">
              You can read the briefs that have already come out of this on the{" "}
              <Link href="/rfps">requests for proposals</Link> page.
            </p>
          </aside>
        </div>

        <div className="suggest-form" id="form">
          <h2 className="section-title">Your suggestion</h2>
          <SuggestionForm areas={copy.areas} />
          <p className="note privacy-note">{copy.privacy}</p>
        </div>
      </section>
    </>
  );
}
