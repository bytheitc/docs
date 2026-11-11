import Link from "next/link";
import { Khatam, variantFor } from "@/components/Khatam";
import { authed, requireUser } from "@/lib/session";
import { themeFor, type SpaceSummary } from "@/lib/types";

export const metadata = { title: "Spaces" };

type Props = { searchParams: Promise<{ denied?: string; noaccess?: string }> };

export default async function SpacePicker({ searchParams }: Props) {
  const user = await requireUser();
  const { denied, noaccess } = await searchParams;
  const { spaces } = await authed<{ spaces: SpaceSummary[] }>("/v1/spaces");

  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">Islamic Tech Collective</p>
        <h1>Assalāmu ʿalaykum, {user.name.split(" ")[0]}.</h1>
        <p className="cms-muted">Choose a house to edit. Each space holds one house&rsquo;s content, in its own colours.</p>
      </header>

      {denied && <p className="cms-flash bad" role="alert">That page needs the {denied} role. Ask an admin if you need access.</p>}
      {noaccess && <p className="cms-flash bad" role="alert">Your account doesn&rsquo;t have access to the &ldquo;{noaccess}&rdquo; space. Ask an admin if you need it.</p>}

      {spaces.length ? (
        <section className="cms-spacecards" aria-label="Spaces">
          {spaces.map((s) => (
            <Link key={s.id} href={`/spaces/${s.id}`} className="cms-spacecard" data-space={themeFor(s.id)}>
              <Khatam variant={variantFor(s.id)} className="cms-mark" strokeWidth={5} accent="var(--cms-mark-accent)" />
              <span className="cms-spacecard-label">{s.label}</span>
              <h2>{s.title}</h2>
              <span className="cms-spacecard-stats">
                <span><strong>{s.entries}</strong> {s.entries === 1 ? "entry" : "entries"}</span>
                <span><strong>{s.waiting}</strong> waiting</span>
                <span><strong>{s.inboxNew}</strong> new in inbox</span>
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <section className="cms-panel">
          <h2>No spaces yet</h2>
          <p className="cms-muted">
            {user.role === "admin"
              ? "A space appears here when a house api registers its schema with the CMS (PUT /v1/spaces/:space/schema). Start a house api with its CMS_SPACE_KEY to register it."
              : "Your account doesn't have access to any space yet. Ask an admin to add you to one."}
          </p>
        </section>
      )}
    </div>
  );
}
