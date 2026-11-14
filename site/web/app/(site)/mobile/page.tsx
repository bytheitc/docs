import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { getMobilePage } from "@/lib/data";

export const metadata: Metadata = {
  title: "The app",
  description:
    "The Islamic Tech Collective contributor portal on your phone: your profile, the work recorded in your name, and the issues you are holding.",
};

/**
 * A phone, drawn rather than photographed. A screenshot would go stale the first time the app
 * changed and would need a binary in the repo; this is the app's real structure in markup, so it
 * stays honest about what the screens contain and costs nothing to ship.
 */
function Phone({ screen, label }: { screen: "home" | "profile" | "claims"; label: string }) {
  return (
    <figure className="mb-phone" aria-label={label}>
      <div className="mb-screen" data-screen={screen}>
        <p className="mb-screen-title">{screen === "home" ? "Home" : screen === "profile" ? "Profile" : "Claims"}</p>

        {screen === "home" && (
          <>
            <div className="mb-card mb-id">
              <span className="mb-avatar" aria-hidden="true">AM</span>
              <span>
                <b>Your name</b>
                <i>@your-handle</i>
              </span>
            </div>
            <div className="mb-card mb-stats">
              <span><b>12</b><i>counted</i></span>
              <span><b>1</b><i>open claim</i></span>
            </div>
            <p className="mb-eyebrow">Next milestone</p>
            <div className="mb-card mb-milestone">
              <b>Ten contributions</b>
              <span className="mb-bar"><span style={{ width: "72%" }} /></span>
              <i>12 of 15</i>
            </div>
          </>
        )}

        {screen === "profile" && (
          <>
            <div className="mb-card mb-id">
              <span className="mb-avatar" aria-hidden="true">AM</span>
              <span>
                <b>Your name</b>
                <i>@your-handle</i>
              </span>
            </div>
            <p className="mb-eyebrow">Visibility</p>
            <div className="mb-card mb-rows">
              <span>Public profile <em className="on">On</em></span>
              <span>On the contributors wall <em className="on">On</em></span>
              <span>Shows your linked accounts <em>Off</em></span>
              <span>Shows your contributions <em className="on">On</em></span>
            </div>
          </>
        )}

        {screen === "claims" && (
          <>
            <div className="mb-cta">Claim an issue</div>
            <p className="mb-eyebrow">Open</p>
            <div className="mb-card mb-claim">
              <b>owner/repo #214</b>
              <i>GitHub · claimed 3 Nov</i>
              <i className="mb-warn">Expires in 2 days</i>
            </div>
            <div className="mb-card mb-claim">
              <b>owner/other #88</b>
              <i>GitHub · claimed 9 Nov</i>
              <i>Expires in 8 days</i>
            </div>
          </>
        )}
      </div>
    </figure>
  );
}

export default async function MobilePage() {
  const { lede, features, notYet, appStoreUrl, playStoreUrl, betaNote } = await getMobilePage();
  const published = Boolean(appStoreUrl || playStoreUrl);

  return (
    <>
      <PageHero
        eyebrow="The app"
        arabic="أمانة"
        gloss="amāna · a trust"
        title={<>Your work, and <em>your say</em> over it.</>}
        lede={lede}
      >
        <div className="mb-actions">
          {published ? (
            <>
              {appStoreUrl && (
                <a className="btn" href={appStoreUrl} rel="noreferrer">
                  Download for iOS
                </a>
              )}
              {playStoreUrl && (
                <a className="btn btn-ghost" href={playStoreUrl} rel="noreferrer">
                  Get it on Google Play
                </a>
              )}
            </>
          ) : (
            <>
              <Link className="btn" href="/contact">
                Ask for the test build
              </Link>
              <a className="btn btn-ghost" href={process.env.NEXT_PUBLIC_ITC_PORTAL_URL ?? "http://localhost:3006"}>
                Use the portal on the web
              </a>
            </>
          )}
        </div>
        {!published && betaNote && <p className="mb-beta">{betaNote}</p>}
      </PageHero>

      <section className="mb-shots" aria-label="What the app looks like">
        <Phone screen="home" label="The home screen: who you are, what you have done, what is waiting on you" />
        <Phone screen="profile" label="The profile screen: what is public and what is not" />
        <Phone screen="claims" label="The claims screen: the issues you are holding" />
      </section>

      {features.length > 0 && (
        <section className="mb-features">
          <div className="section-head">
            <p className="eyebrow">What it does</p>
            <h2>Everything the portal does for you, in your pocket.</h2>
          </div>
          <ul className="mb-list">
            {features.map((f) => (
              <li key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notYet.length > 0 && (
        <section className="mb-notyet">
          <div className="section-head">
            <p className="eyebrow">What it doesn&rsquo;t do</p>
            <h2>A phone is the wrong place for some things.</h2>
            <p>
              Governance is decided in the open, with the whole record beside it. That belongs on a
              screen you can read properly, not one you glance at on a train.
            </p>
          </div>
          <ul className="mb-donts">
            {notYet.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-privacy">
        <div className="section-head">
          <p className="eyebrow">What it holds</p>
          <h2>It keeps as little as it can.</h2>
        </div>
        <dl className="mb-defs">
          <div>
            <dt>Your session</dt>
            <dd>
              Kept in the device keychain, not in ordinary storage. Signing out ends it here;
              signing out everywhere ends it on every device and in the browser too.
            </dd>
          </div>
          <div>
            <dt>Your provider password</dt>
            <dd>
              Never seen. Sign-in happens on the provider&rsquo;s own page, and the access token is used
              once to read your profile and then discarded. The portal never stores one.
            </dd>
          </div>
          <div>
            <dt>Your data</dt>
            <dd>
              Yours to take a copy of or delete, from inside the app, without asking anyone.
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
