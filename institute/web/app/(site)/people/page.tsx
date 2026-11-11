import type { Metadata } from "next";
import { NicheArch } from "@/components/Arch";
import { PageHead, SectionHead } from "@/components/Heads";
import { getPeople } from "@/lib/data";
import { roman } from "@/lib/roman";

export const metadata: Metadata = {
  title: "People",
  description: "The officers, fellows, visiting scholars and advisory board of the Institute for the Centers.",
};

export default async function PeoplePage() {
  const people = await getPeople();
  return (
    <>
      <PageHead
        id="people-head"
        arch={{ arabic: "أهل", translit: "ahl", sense: "people, household" }}
        kicker="People"
        title={<>The people <em>of the house.</em></>}
        lede="A house is its people. The roster below shows the seats the Institute keeps; names are announced at each year's convocation."
      />

      <nav className="toc" aria-label="On this page">
        {people.map((g, k) => (
          <a key={g.id} href={`#${g.id}`}>{roman(k + 1)} · {g.kicker}</a>
        ))}
      </nav>

      {people.map((g, k) => (
        <section key={g.id} id={g.id} className={k % 2 ? "block band" : "block"}>
          <SectionHead numeral={roman(k + 1)} kicker={g.kicker} title={g.title} />
          <p className="intro">{g.intro}</p>
          <ul className="niches">
            {g.people.map((p, j) => (
              <li key={j} className="niche">
                <NicheArch />
                <p className="niche-role">{p.role}</p>
                {p.affiliation && <p className="niche-aff">{p.affiliation}</p>}
                <p className="niche-name">{p.name}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
