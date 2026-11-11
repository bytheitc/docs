import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { getGroups, getPublications } from "@/lib/data";
import { HOUSES } from "@/lib/houses";

export const metadata: Metadata = {
  title: "Research groups",
  description: "The four research groups of ITC Research: Language & Text, Trust & Evaluation, Society & Policy, and Systems.",
};

export default async function GroupsPage() {
  const [GROUPS, PUBLICATIONS] = await Promise.all([getGroups(), getPublications()]);
  const houseName = (id: string) => HOUSES.find((h) => h.id === id)?.name ?? id;
  return (
    <div className="page">
      <PageHead kicker="Groups" title="Research groups" lede="Four groups, each with a standing agenda and a list of open questions. Each works with one or more houses of the Collective." />
      <section className="sec">
        <ol className="group-list">
          {GROUPS.map((g, i) => (
            <li key={g.slug}>
              <p className="pub-meta"><span className="pub-type">§{i + 1}</span><span>{PUBLICATIONS.filter((p) => p.group === g.name).length} publications</span></p>
              <h2><Link href={`/groups/${g.slug}`}>{g.name}</Link></h2>
              <p className="pub-group">{g.focus} · with {g.collaborators.map((c) => houseName(c.house)).join(", ")}</p>
              <p className="pub-sum">{g.agenda[0]}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
