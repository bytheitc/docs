import { redirect } from "next/navigation";
import { LoginForm, SetupForm } from "@/components/cms/Forms";
import { Khatam } from "@/components/Khatam";
import { currentUser, setupTokenRequired } from "@/lib/cms/auth";
import { CMS_CONFIG } from "@/lib/cms/config";
import { getStorage, storageStatus } from "@/lib/cms/storage";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const status = storageStatus();
  const store = getStorage();

  if (!store) {
    return (
      <AuthShell title="Connect a database">
        <p className="cms-flash bad" role="alert">{status.problem}</p>
        <p>The public site is serving its built-in content, read-only. To edit it here:</p>
        <ol className="cms-steps">
          <li>Create a MongoDB database (for example a free Atlas cluster).</li>
          <li>In this app&rsquo;s folder, create <code>.env.local</code> containing <code>MONGODB_URI=…</code>.</li>
          <li>Restart the server and reload this page.</li>
        </ol>
      </AuthShell>
    );
  }

  let users: number;
  try {
    users = await store.countUsers();
  } catch (e) {
    return (
      <AuthShell title="Can't reach the database">
        <p className="cms-flash bad" role="alert">The database didn&rsquo;t respond: {(e as Error).message}</p>
        <p>Check <code>MONGODB_URI</code>, and that your network address is allowed in the cluster&rsquo;s access list.</p>
      </AuthShell>
    );
  }

  if (users > 0 && (await currentUser())) redirect("/admin");

  return users === 0 ? (
    <AuthShell title="Set up the admin">
      <p>No one has an account yet. Create the first administrator; you can add editors afterwards.</p>
      <SetupForm needsToken={setupTokenRequired()} />
    </AuthShell>
  ) : (
    <AuthShell title="Sign in">
      <LoginForm />
    </AuthShell>
  );
}

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="cms-auth">
      <div className="cms-auth-card">
        <div className="cms-auth-brand">
          <Khatam variant={CMS_CONFIG.house} className="cms-mark" strokeWidth={5} accent="var(--cms-accent)" />
          <span>{CMS_CONFIG.title}</span>
        </div>
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}
