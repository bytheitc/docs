import Link from "next/link";
import { Construction } from "@/components/Construction";
import { PageIndex } from "@/components/PageIndex";
import { Chip } from "@/components/Sheet";
import { getChapter, getHomeSheet, getPlatforms, getTeams } from "@/lib/data";
import { house } from "@/lib/houses";
import { findTeam } from "@/lib/teams";

const SECTIONS = [
  { id: "overview", num: "01", label: "Overview" },
  { id: "platforms", num: "02", label: "Platforms" },
  { id: "practices", num: "03", label: "Practices" },
  { id: "stack", num: "04", label: "Stack" },
  { id: "teams", num: "05", label: "Teams" },
  { id: "join", num: "06", label: "Join" },
];

export default async function EngineeringHome() {
  const self = house("engineering");
  const [practicesChapter, platforms, teams, home] = await Promise.all([getChapter("practices"), getPlatforms(), getTeams(), getHomeSheet()]);
  const practices = practicesChapter?.sections ?? [];
  const summary = (id: string) => home.practices.find((p) => p.section === id)?.summary ?? "";
  return (
    <>
      <PageIndex sections={SECTIONS} />

      {/* Title block, like a drawing sheet */}
      <section className="hero grid">
        <div className="hero-copy">
          <p className="kicker mono">ITC / ENG / 00 · Title sheet</p>
          <h1>Build it right.<br />Then build it to last.</h1>
          <p className="lede">
            ITC Engineering builds the platforms, practices and tools that every house of the collective runs on.
            We care about correctness, longevity and the people on the other end of the wire.
          </p>
        </div>
        <div className="hero-fig">
          <Construction />
        </div>
        <dl className="title-block">
          <div><dt>Discipline</dt><dd><span className="ar" lang="ar">{self.arabic}</span> {self.transliteration}</dd></div>
          <div><dt>Meaning</dt><dd>engineering · geometry</dd></div>
          <div><dt>Scope</dt><dd>All five houses</dd></div>
          <div><dt>Status</dt><dd><Link href="/status" className="u">see status sheet →</Link></dd></div>
        </dl>
      </section>

      <section id="overview" className="sec">
        <header className="sec-head"><span className="mono">01</span><h2>Overview</h2></header>
        <div className="grid three">
          <div className="cell"><p className="cell-k mono">01.1</p><h3>We build the ground</h3><p>Shared platforms so each house can focus on its mission instead of rebuilding auth, storage and deploys.</p><Link className="more mono" href="/platforms">Platforms →</Link></div>
          <div className="cell"><p className="cell-k mono">01.2</p><h3>We set the standard</h3><p>Practices for review, privacy, accessibility and reliability, written down and applied everywhere.</p><Link className="more mono" href="/handbook">Handbook →</Link></div>
          <div className="cell"><p className="cell-k mono">01.3</p><h3>We teach the craft</h3><p>Mentorship, pairing and open documentation, so engineering at ITC is a place where people grow.</p><Link className="more mono" href="/blog">Write-ups →</Link></div>
        </div>
      </section>

      <section id="platforms" className="sec">
        <header className="sec-head"><span className="mono">02</span><h2>Platforms</h2><p className="sec-note mono">placeholder registry</p></header>
        <div className="table-wrap">
          <table className="spec">
            <thead><tr><th>ID</th><th>Name</th><th>Purpose</th><th>Owner</th><th>Status</th></tr></thead>
            <tbody>
              {platforms.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.id}</td>
                  <td className="strong"><Link href={`/platforms/${p.slug}`} className="row-link">{p.name}</Link></td>
                  <td>{p.purpose}</td>
                  <td className="mono"><Link href={`/teams/${p.owner}`} className="u">{findTeam(teams, p.owner)?.code}</Link></td>
                  <td><Chip kind={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="after mono"><Link href="/platforms" className="u">Full registry and spec sheets →</Link></p>
      </section>

      <section id="practices" className="sec">
        <header className="sec-head"><span className="mono">03</span><h2>Practices</h2></header>
        <ol className="practices">
          {practices.map((p, i) => (
            <li key={p.id}>
              <Link href={`/handbook/practices#${p.id}`} className="card-link">
                <span className="p-num mono">03.{i + 1}</span>
                <h3>{p.title}</h3>
                <p>{summary(p.id)}</p>
              </Link>
            </li>
          ))}
        </ol>
        <p className="after mono"><Link href="/handbook" className="u">Read the handbook →</Link></p>
      </section>

      <section id="stack" className="sec">
        <header className="sec-head"><span className="mono">04</span><h2>Stack</h2></header>
        <div className="grid four">
          {home.stack.map((s) => (
            <div key={s.group} className="stack-col">
              <p className="cell-k mono">{s.group}</p>
              <ul>{s.items.map((i) => <li key={i} className="mono">{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section id="teams" className="sec">
        <header className="sec-head"><span className="mono">05</span><h2>Teams</h2></header>
        <div className="teams">
          {teams.map((t) => (
            <Link key={t.code} href={`/teams/${t.slug}`} className="team">
              <span className="team-code mono">{t.code}</span>
              <h3>{t.name}</h3>
              <p>{t.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="join" className="sec join">
        <header className="sec-head"><span className="mono">06</span><h2>Join</h2></header>
        <div className="join-box">
          <div>
            <h3>Engineers who care how things are made.</h3>
            <p>Full-time, part-time and volunteer roles across every team. Open-source contributors start at ITC Open Source.</p>
          </div>
          <div className="join-actions">
            <Link className="btn" href="/careers">Open roles →</Link>
            <a className="btn ghost" href="mailto:engineering@example.org">engineering@example.org →</a>
            <a className="btn ghost" href={house("oss").url}>Contribute in the open →</a>
          </div>
        </div>
      </section>
    </>
  );
}
