import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { confirmNewsletter, getNewsletterLists } from "@/lib/api";

export const metadata: Metadata = { title: "Confirming your subscription", robots: { index: false } };

/** The other half of double opt-in: the link in the one email we sent. */
export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await confirmNewsletter(token) : null;
  const { lists: all } = await getNewsletterLists();
  const label = (id: string) => all.find((l) => l.id === id)?.label ?? id;

  return (
    <>
      <PageHero
        eyebrow="Newsletter"
        title={result?.ok ? <>You&rsquo;re <em>subscribed</em>.</> : <>That link didn&rsquo;t <em>work</em>.</>}
        lede={
          result?.ok
            ? `You'll hear from us about ${result.lists.map(label).join(", ")}.`
            : "Confirmation links last two days and can only be used once."
        }
      />
      <section className="narrow-section">
        <div className="prose">
          {result?.ok ? (
            <p>
              We&rsquo;ve sent you one more email with a link that changes your lists or removes you at any time.
              Keep it — it is the only way in, and it needs no password.
            </p>
          ) : (
            <p>
              {result ? result.message : "This page needs the link from the email we sent you."} You can{" "}
              <Link href="/newsletter">subscribe again</Link>, and we&rsquo;ll send a fresh link.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
