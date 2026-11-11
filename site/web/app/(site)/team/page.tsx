import type { Metadata } from "next";
import Link from "next/link";
import { Khatam } from "@/components/Khatam";
import { PageHero } from "@/components/PageHero";
import { TBA_NAME, type Role } from "@/lib/team";
import { getTeam } from "@/lib/data";

export const metadata: Metadata = {
  title: "Team",
  description: "The leadership, house stewards and councils of the Islamic Tech Collective.",
};

function RoleCard({ r }: { r: Role }) {
  return (
    <li className="role">
      <div className="role-portrait" aria-hidden="true">
        <Khatam variant={r.house ?? "site"} strokeWidth={3} accent="var(--gold)" />
      </div>
      <p className="role-title">{r.title}</p>
      <p className="role-name">{r.name || TBA_NAME}</p>
      <p className="role-remit">{r.remit}</p>
    </li>
  );
}

export default async function TeamPage() {
  const { leadership: LEADERSHIP, stewards: STEWARDS, councils: COUNCILS } = await getTeam();
  return (
    <>
      <PageHero
        eyebrow="Leadership & stewards"
        title={<>The people who <em>hold the trust</em>.</>}
        lede="Roles are listed here before names. We will introduce each person as they are appointed, through an open call and by consultation."
      />
      <section className="team-section">
        <h2 className="team-h">Leadership</h2>
        <ul className="roles">{LEADERSHIP.map((r) => <RoleCard key={r.title} r={r} />)}</ul>
      </section>
      <section className="team-section">
        <h2 className="team-h">House stewards</h2>
        <ul className="roles roles-5">{STEWARDS.map((r) => <RoleCard key={r.title} r={r} />)}</ul>
      </section>
      <section className="team-section">
        <h2 className="team-h">Councils</h2>
        <dl className="councils">
          {COUNCILS.map((c) => (
            <div key={c.title}><dt>{c.title}</dt><dd>{c.remit}</dd></div>
          ))}
        </dl>
      </section>
      <section className="cta-band">
        <h2>Could one of these be you?</h2>
        <p>The call for house stewards is open.</p>
        <div className="hero-ctas center">
          <Link href="/news/call-for-stewards" className="btn">Read the call</Link>
          <Link href="/join" className="btn btn-ghost">Volunteer →</Link>
        </div>
      </section>
    </>
  );
}
