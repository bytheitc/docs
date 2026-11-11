import { redirect } from "next/navigation";
import { LoginForm, SetupForm } from "@/components/Forms";
import { Khatam } from "@/components/Khatam";
import { Themed } from "@/components/Shell";
import { ApiError, api } from "@/lib/api";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let status: { setupNeeded: boolean; setupTokenRequired: boolean };
  try {
    status = await api("/v1/auth/status");
  } catch (e) {
    return (
      <AuthShell title="Can't reach the CMS">
        <p className="cms-flash bad" role="alert">{e instanceof ApiError ? e.message : "The CMS service didn't respond."}</p>
        <p>Check that <code>cms/api</code> is running and that <code>CMS_API_URL</code> points at it.</p>
      </AuthShell>
    );
  }

  if (!status.setupNeeded && (await currentUser())) redirect("/");

  return status.setupNeeded ? (
    <AuthShell title="Set up the CMS">
      <p>No one has an account yet. Create the first administrator; you can add editors afterwards.</p>
      <SetupForm needsToken={status.setupTokenRequired} />
    </AuthShell>
  ) : (
    <AuthShell title="Sign in">
      <LoginForm />
    </AuthShell>
  );
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Themed theme="itc">
      <main className="cms-auth">
        <div className="cms-auth-card">
          <div className="cms-auth-brand">
            <Khatam variant="site" className="cms-mark" strokeWidth={5} accent="var(--cms-mark-accent)" />
            <span>ITC CMS</span>
          </div>
          <h1>{title}</h1>
          {children}
        </div>
      </main>
    </Themed>
  );
}
