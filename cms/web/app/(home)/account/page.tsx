import { PasswordForm } from "@/components/Forms";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="cms-page">
      <header className="cms-head">
        <p className="cms-kicker">Account</p>
        <h1>{user.name}</h1>
        <p className="cms-muted">{user.email} · {user.role} · {user.spaces === "*" ? "all spaces" : user.spaces.join(", ") || "no spaces"}</p>
      </header>
      <section className="cms-panel">
        <h2>Change password</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
