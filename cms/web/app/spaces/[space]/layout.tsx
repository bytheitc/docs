// A space's frame: rendered in its house theme, with the space's collections, registered links and inbox.
import type { NavLink } from "@/components/AdminNav";
import { Shell } from "@/components/Shell";
import { loadSpace, requireUser } from "@/lib/session";
import { themeFor } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SpaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ space: string }> }) {
  const user = await requireUser();
  const { space: id } = await params;
  const { space, inboxNew } = await loadSpace(id);
  const base = `/spaces/${space.id}`;
  const links: NavLink[] = [
    { href: base, label: "Overview", exact: true },
    ...space.collections.map((c) => ({ href: `${base}/c/${c.name}`, label: c.label })),
    { href: `${base}/inbox`, label: "Inbox", badge: inboxNew || undefined },
    ...space.links.map((l, i) => ({ href: l.href, label: l.label, external: true, group: i === 0 ? "Tools" : undefined })),
  ];
  return <Shell theme={themeFor(space.id)} brand={space.title} brandHref={base} links={links} user={user}>{children}</Shell>;
}
