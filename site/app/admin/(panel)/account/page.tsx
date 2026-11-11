import { PasswordForm } from "@/components/cms/Forms";
import { requireUser } from "@/lib/cms/auth";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">Account</p>
        <h1>{user.name}</h1>
        <p className="cms-muted">{user.email} · {user.role}</p>
      </header>
      <section className="cms-panel">
        <h2>Change password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
