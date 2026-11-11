import { SignInForm } from "./SignInForm";
import { currentStaff } from "@/lib/staff-session";
import { safeNext } from "@/lib/util";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

export default async function StaffSignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/staff");
  if (await currentStaff()) redirect(next);
  return (
    <div className="cms-panel" style={{ maxWidth: 440, margin: "48px auto" }}>
      <h1 style={{ fontFamily: "var(--cms-font-display)", fontSize: 28 }}>Portal tools</h1>
      <p className="cms-muted" style={{ marginBottom: 16 }}>
        Sign in with your Studio account. You need access to the <strong>portal</strong> space; ask an
        administrator if you don&rsquo;t have it yet.
      </p>
      <SignInForm next={next} />
    </div>
  );
}
