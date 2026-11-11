import type { Metadata } from "next";
import Link from "next/link";
import { InvolvementForm } from "@/components/InvolvementForm";
import { PageHero } from "@/components/PageHero";
import { getJoinPage } from "@/lib/data";

export const metadata: Metadata = {
  title: "Join",
  description: "Become a member, volunteer, partner or donor of the Islamic Tech Collective.",
};

export default async function JoinPage() {
  const { ways: WAYS } = await getJoinPage();
  return (
    <>
      <PageHero
        eyebrow="Join the collective"
        title={<>There is a place for you <em>here</em>.</>}
        lede="Whether you write code, write papers, teach, organise or simply care how technology shapes our lives, there is a way in. Choose one below, or tell us and we’ll help you find it."
      />

      <section className="ways">
        {WAYS.map((w, i) => (
          <article key={w.title} className="way">
            <span className="way-n">{String(i + 1).padStart(2, "0")}</span>
            <h2>{w.title}</h2>
            <p>{w.body}</p>
            <p className="way-gives"><span>What it asks</span>{w.gives}</p>
            {w.link && <Link href={w.link.href} className="text-link">{w.link.label}</Link>}
          </article>
        ))}
      </section>

      <section id="join-form" className="form-section">
        <div className="fs-intro">
          <p className="eyebrow">Express interest</p>
          <h2>Tell us a little about yourself.</h2>
          <p>A person, not a mailing list, will read this and write back. There is no fee to join.</p>
          <p className="fine-note">Membership terms are still being drafted and will be published for comment.</p>
        </div>
        <InvolvementForm />
      </section>
    </>
  );
}
