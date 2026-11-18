import { redirect } from "next/navigation";
import { SignInForm } from "./SignInForm";
import { TopBar } from "@/components/TopBar";
import { currentStaff } from "@/lib/staff-session";
import { safeNext } from "@/lib/util";

export const metadata = { title: "Sign in" };

export default async function StaffSignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/staff/lists");
  if (await currentStaff()) redirect(next);
  return (
    <>
      <TopBar />
      <main id="main" className="narrow">
        <div className="card">
          <h1>Sign in</h1>
          <p className="muted">
            Sign in with your Studio account. You need access to the <strong>email</strong> space;
            ask an administrator if you don't have it yet.
          </p>
          <div style={{ marginTop: 16 }}><SignInForm next={next} /></div>
        </div>
      </main>
    </>
  );
}
