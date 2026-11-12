import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PageHero } from "@/components/PageHero";
import { getNewsletterLists } from "@/lib/api";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "Word from the Islamic Tech Collective and its houses, as often as there is something worth saying.",
};

export default async function NewsletterPage() {
  const { lists, available } = await getNewsletterLists();

  return (
    <>
      <PageHero
        eyebrow="Newsletter"
        title={<>Word from the <em>houses</em>.</>}
        lede="One list for the Collective and one for each house. Choose what you want to hear about, and nothing else arrives."
      />

      <section className="narrow-section">
        <div className="prose">
          <p>
            We write when there is something worth saying: a new brief on <Link href="/rfps">requests for proposals</Link>,
            a gathering, a piece of research, a project that needs people. Not on a schedule, and not to fill a quota.
          </p>
          <h2>What we do with your address</h2>
          <ul>
            <li>We send you one email to confirm it is really you. You are not on any list until you open the link in it.</li>
            <li>We store the address and which lists you chose. Nothing else — no name, no tracking, no opens or clicks.</li>
            <li>Every email carries a link that changes your lists or removes you, with no password and no sign-in.</li>
            <li>We never sell, share or rent the list, and we do not use it to advertise anything.</li>
          </ul>
        </div>

        <div className="narrow-form">
          {available ? (
            <NewsletterForm lists={lists} />
          ) : (
            <p className="flash-note" role="status">
              The newsletter isn&rsquo;t open for sign-ups just yet. <Link href="/contact">Write to us</Link> and
              we&rsquo;ll add you by hand when it is.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
