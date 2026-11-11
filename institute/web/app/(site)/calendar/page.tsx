import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/Heads";
import { getYear } from "@/lib/data";
import { roman } from "@/lib/roman";

export const metadata: Metadata = {
  title: "The Year",
  description: "The Institute's year: convocation, the seminar term, the colloquium and the proceedings.",
};

export default async function CalendarPage() {
  const year = await getYear();
  return (
    <>
      <PageHead
        id="calendar-head"
        arch={{ arabic: "تقويم", translit: "taqwīm", sense: "calendar, reckoning of time" }}
        kicker="The Year at the Institute"
        title={<>A rhythm <em>of study.</em></>}
        lede="The Institute keeps one year in four seasons: it gathers, it reads, it presents, and it publishes. Dates are announced each year; what follows is the shape the year keeps."
      />

      <section className="year">
        <ol className="seasons">
          {year.map((y) => (
            <li key={y.slug}>
              <a href={`#${y.slug}`}>
                <span className="season">{y.season}</span>
                <h3>{y.title}</h3>
              </a>
            </li>
          ))}
        </ol>
      </section>

      {year.map((y, k) => (
        <section key={y.slug} id={y.slug} className={k % 2 ? "block band season-block" : "block season-block"}>
          <header className="season-head">
            <span className="season-roman">{roman(k + 1)}</span>
            <p className="sec-kicker">{y.season}</p>
            <h2>{y.title}</h2>
            <p>{y.body}</p>
          </header>
          <ul className="events">
            {y.events.map((e) => (
              <li key={e.title}>
                <p className="ev-meta"><span>{e.kind}</span> · {e.when}</p>
                <h3>{e.title}</h3>
                <p>{e.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="propose">
        <h2>The year ends in writing.</h2>
        <p>Each summer the work of the year is gathered into the proceedings.</p>
        <Link className="btn" href="/proceedings">Read the proceedings</Link>
      </section>
    </>
  );
}
