import Link from "next/link";
import { ProfileForm } from "@/components/portal/Forms";
import { requireContributor } from "@/lib/portal/session";

export const metadata = { title: "Public profile" };

export default async function ProfilePage() {
  const me = await requireContributor("/dashboard/profile");
  return (
    <>
      <header className="dash-head">
        <h1>Public profile</h1>
        <p>Entirely opt-in. Your dashboard, numbers and milestones are never public.</p>
      </header>
      {me.profile.public && <p className="flash info">Your profile is public at <Link href={`/u/${me.handle}`}>/u/{me.handle}</Link>.</p>}
      <section className="panel">
        <ProfileForm handle={me.handle} displayName={me.displayName} profile={me.profile} />
      </section>
    </>
  );
}
