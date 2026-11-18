import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { currentStaff, safeNext } from "@/lib/staff-session";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in", robots: { index: false } };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/admin");
  if (await currentStaff()) redirect(next);
  return (
    <>
      <Header withMenu={false} />
      <main id="main" className="signin">
        <div className="card">
          <p className="eyebrow">Docs editor</p>
          <h1 style={{ margin: "0 0 6px", font: "600 28px/1.2 var(--display)" }}>Sign in</h1>
          <p style={{ margin: "0 0 18px", color: "var(--ink-2)" }}>
            Use your CMS account. You need access to the <strong>Docs</strong> space; an administrator can give it to you.
          </p>
          <SignInForm next={next} />
        </div>
      </main>
    </>
  );
}
