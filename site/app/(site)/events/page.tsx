import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { getEvents } from "@/lib/data";

export const metadata: Metadata = {
  title: "Gatherings",
  description: "The Annual Majlis, Commons Sprint, Reading Circle and other gatherings of the Islamic Tech Collective.",
};

export default async function EventsPage() {
  const EVENTS = await getEvents();
  return (
    <>
      <PageHero
        eyebrow="Gatherings"
        title={<>Where the collective <em>meets</em>.</>}
        lede="Some gatherings bring all five houses together; others are small and regular. Dates are still being set. Join to hear first."
      />
      <section className="gatherings list-page">
        <div className="events">
          {EVENTS.map((e) => (
            <Link key={e.slug} href={`/events/${e.slug}`} className="event">
              <div className="ev-date"><span className="ev-day">—</span><span className="ev-mon">Date {e.date}</span></div>
              <div>
                <p className="ev-house">{e.hostLabel} · {e.cadence} · {e.format}</p>
                <h3>{e.title}</h3>
                <p>{e.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
