import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { PreferencesForm } from "@/components/PreferencesForm";
import { getNewsletterPreferences } from "@/lib/api";

export const metadata: Metadata = { title: "Your newsletter lists", robots: { index: false } };

/** Reached from the link in every email. The token is the authority; there is nothing to sign in to. */
export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await getNewsletterPreferences(token) : null;

  return (
    <>
      <PageHero
        eyebrow="Newsletter"
        title={<>Your <em>lists</em>.</>}
        lede={result?.ok ? `Settings for ${result.email}.` : "This page needs the link from one of our emails."}
      />
      <section className="narrow-section">
        <div className="narrow-form">
          {result?.ok ? (
            <PreferencesForm token={token!} allLists={result.allLists} current={result.lists} />
          ) : (
            <p className="flash-note" role="alert">
              {result ? result.message : "Open this page from the link at the bottom of any email we sent you."}{" "}
              <Link href="/newsletter">Subscribe again</Link> if you&rsquo;d rather start fresh.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
