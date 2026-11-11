import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { type Role } from "@/lib/groups";
import { getGroups, getOffice } from "@/lib/data";

export const metadata: Metadata = {
  title: "People",
  description: "Researchers and affiliates of ITC Research, by group. Appointments to be announced.",
};

function Roster({ roles }: { roles: Role[] }) {
  return (
    <ul className="roster">
      {roles.map((r, i) => (
        <li key={i}>
          <span className="r-role">{r.role}</span>
          <span className="r-name">{r.name}</span>
          {r.note && <span className="r-note">{r.note}</span>}
        </li>
      ))}
    </ul>
  );
}

export default async function PeoplePage() {
  const [GROUPS, OFFICE] = await Promise.all([getGroups(), getOffice()]);
  return (
    <div className="page">
      <PageHead
        kicker="People · Roles"
        title="Researchers & affiliates"
        lede="ITC Research is being staffed. The roles below are the ones we are filling; names will be listed as appointments are confirmed."
      />
      <section className="sec">
        <header className="sec-head"><h2>Editorial office</h2></header>
        <Roster roles={OFFICE} />
      </section>
      {GROUPS.map((g, i) => (
        <section key={g.slug} id={g.slug} className="sec">
          <header className="sec-head"><h2><span className="c-num">§{i + 1}</span>{g.name}</h2><p><Link href={`/groups/${g.slug}`}>Group page →</Link></p></header>
          <Roster roles={g.roles} />
        </section>
      ))}
      <section className="sec">
        <p className="contact">Enquiries about roles, visiting positions and affiliations: <a href="mailto:research@example.org">research@example.org</a></p>
      </section>
    </div>
  );
}
