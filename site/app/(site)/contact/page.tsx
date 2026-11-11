import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { Khatam } from "@/components/Khatam";
import { PageHero } from "@/components/PageHero";
import { house } from "@/lib/houses";
import { getContactPage, getHouseProfiles } from "@/lib/data";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the Islamic Tech Collective or any of its five houses.",
};

export default async function ContactPage() {
  const [{ channels: GENERAL, topics }, HOUSE_PROFILES] = await Promise.all([getContactPage(), getHouseProfiles()]);
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={<>Write to <em>us</em>.</>}
        lede="Every message is read by a person. Write to the collective, or go straight to the house you need."
      />
      <section className="contact">
        <div className="channels">
          <h2 className="team-h">General</h2>
          <ul className="channel-list">
            {GENERAL.map((g) => (
              <li key={g.email}>
                <Khatam variant="site" className="ch-mark" strokeWidth={5} accent="var(--gold)" />
                <span className="ch-label">{g.label}</span>
                <a href={`mailto:${g.email}`}>{g.email}</a>
              </li>
            ))}
          </ul>
          <h2 className="team-h">The houses</h2>
          <ul className="channel-list">
            {HOUSE_PROFILES.map((p) => {
              const h = house(p.id);
              return (
                <li key={p.id}>
                  <Khatam variant={p.id} className="ch-mark" strokeWidth={5} accent="var(--gold)" />
                  <span className="ch-label">{p.label} <span lang="ar" className="ch-ar">{h.arabic}</span> <small>{h.transliteration}</small></span>
                  <a href={`mailto:${p.email}`}>{p.email}</a>
                  <a href={h.url} className="ch-site">Site →</a>
                </li>
              );
            })}
          </ul>
          <p className="fine-note">Addresses shown are placeholders.</p>
        </div>
        <div className="contact-form">
          <h2 className="team-h">Send a message</h2>
          <ContactForm topics={topics} />
        </div>
      </section>
    </>
  );
}
