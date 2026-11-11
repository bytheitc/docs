import { DeleteForm } from "@/components/portal/Forms";
import { requireContributor } from "@/lib/portal/session";

export const metadata = { title: "Your data" };

export default async function DataPage() {
  const me = await requireContributor("/dashboard/data");
  return (
    <>
      <header className="dash-head">
        <h1>Your data</h1>
        <p>Everything we hold about you is yours to take or to remove.</p>
      </header>
      <section className="panel" aria-labelledby="export-h">
        <h2 id="export-h">Export</h2>
        <p className="muted" style={{ marginBottom: 14 }}>A JSON file with your profile, linked accounts, contributions and claims.</p>
        <a className="btn" href="/dashboard/data/export" download>Download my data (JSON)</a>
      </section>
      <section className="panel danger-zone" aria-labelledby="del-h">
        <h2 id="del-h">Delete your account</h2>
        <p className="muted" style={{ marginBottom: 14 }}>
          This removes your profile, linked accounts, sessions, claims and contributions straight away. It can’t be undone.
          Public work on the platforms themselves (e.g. a merged pull request) stays where it is, but is no longer connected to you here.
        </p>
        <DeleteForm handle={me.handle} />
      </section>
    </>
  );
}
