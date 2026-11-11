// The neutral CMS frame (space picker, accounts, audit log, account), in the Collective's palette.
import { Shell } from "@/components/Shell";
import type { NavLink } from "@/components/AdminNav";
import { authed, requireUser } from "@/lib/session";
import { can, type SpaceSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { spaces } = await authed<{ spaces: SpaceSummary[] }>("/v1/spaces");
  const links: NavLink[] = [
    { href: "/", label: "Spaces", exact: true },
    ...spaces.map((s, i) => ({ href: `/spaces/${s.id}`, label: s.title, badge: s.inboxNew || undefined, group: i === 0 ? "Open a space" : undefined })),
    ...(can(user, "admin")
      ? [{ href: "/accounts", label: "Accounts", group: "Administration" }, { href: "/audit", label: "Audit log" }]
      : []),
  ];
  return <Shell theme="itc" brand="ITC CMS" brandHref="/" links={links} user={user}>{children}</Shell>;
}
