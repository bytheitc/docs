import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { readingMinutes } from "@/lib/guides";
import { getGuides } from "@/lib/data";

export const metadata: Metadata = {
  title: "Guides",
  description: "Plain-language guides for mosques, schools and nonprofits deciding when, and whether, to adopt AI.",
};

export default async function GuidesPage() {
  const GUIDES = await getGuides();
  return (
    <>
      <PageHero
        eyebrow="guides · adoption"
        title={<>When, and <span className="grad">whether.</span></>}
        sub="Guides for committees, governors and trustees, not engineers. Each one starts from your community's needs and ends with a checklist you can bring to a meeting."
        crumbs={[{ href: "/guides", label: "guides" }]}
      />
      <div className="wrap">
        <div className="lab-grid">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="lab-item guide-item">
              <span className="lab-type">{g.slug}</span>
              <span className="lab-title">{g.title}<small>{g.audience} · ~{readingMinutes(g)} min read</small></span>
              <span className="lab-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
        <p className="placeholder-note">{"// placeholder guides. Not legal advice, and not religious rulings: those belong with qualified scholars."}</p>
      </div>
    </>
  );
}
