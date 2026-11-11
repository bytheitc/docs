import Link from "next/link";
import { TopBar } from "@/components/portal/TopBar";
import { getFaq, getLanding } from "@/lib/data";
import { availableProviders, isConfigured, PROVIDERS } from "@/lib/providers";
import { currentContributor } from "@/lib/portal/session";

const CATEGORY: Record<string, string> = { code: "Code", ml: "Models & data", research: "Research", writing: "Writing", translation: "Translation", dev: "Development" };

export default async function Landing({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const [copy, faq, me, { deleted }] = await Promise.all([getLanding(), getFaq(), currentContributor(), searchParams]);
  const live = availableProviders().filter((p) => p.id !== "dev").length;

  return (
    <>
      <TopBar />
      <main id="main">
        <div className="wrap">
          {deleted && <p className="flash ok" role="status" style={{ marginTop: 20 }}>Your account and everything we held about you have been deleted.</p>}
          <section className="hero">
            <div className="hero-grid">
              <div>
                <p className="kicker">Contributor Portal</p>
                <h1>{copy.headline}</h1>
                <p className="lede">{copy.intro}</p>
                <div className="hero-actions">
                  {me ? <Link href="/dashboard" className="btn">Go to your dashboard</Link> : <Link href="/sign-in" className="btn">Connect an account</Link>}
                  <Link href="#privacy" className="btn ghost">Our privacy promise</Link>
                </div>
              </div>
              <div className="wordsign">
                <p className="ar" lang="ar" dir="rtl">مساهمة</p>
                <p className="tr">musāhama</p>
                <p className="sense">contribution, a share given to a common work</p>
                <p className="review-note">Arabic pending native-speaker review.</p>
              </div>
            </div>
          </section>

          <section className="section" aria-labelledby="how">
            <h2 id="how">How connecting works</h2>
            <ol className="steps">
              {copy.steps.map((s) => (<li key={s.title}><h3>{s.title}</h3><p>{s.body}</p></li>))}
            </ol>
          </section>

          <section className="section promise" id="privacy" aria-labelledby="privacy-h">
            <div>
              <h2 id="privacy-h">The privacy promise</h2>
              <p className="muted">Amānah: what you entrust to us is held in trust, and only for you.</p>
            </div>
            <ul>{copy.privacy.map((p) => <li key={p}>{p}</li>)}</ul>
          </section>

          <section className="section" aria-labelledby="providers">
            <h2 id="providers">Platforms you can connect</h2>
            {live === 0 && <p className="flash info" style={{ marginBottom: 16 }}>No platforms are connected on this server yet. They appear for sign-in as administrators configure them.</p>}
            <ul className="provider-grid">
              {PROVIDERS.map((p) => (
                <li key={p.id} className={`provider-card${isConfigured(p) ? "" : " off"}`}>
                  <span className="cat">{CATEGORY[p.category]}</span>
                  <strong>{p.name}</strong>
                  <p>{p.blurb}</p>
                  {!isConfigured(p) && <p><em>Coming soon</em></p>}
                </li>
              ))}
            </ul>
          </section>

          {faq.length > 0 && (
            <section className="section" aria-labelledby="faq">
              <h2 id="faq">Questions</h2>
              <div className="faq">
                {faq.map((f) => (<details key={f.id}><summary>{f.question}</summary><p>{f.answer}</p></details>))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
