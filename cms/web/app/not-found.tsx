import Link from "next/link";
import { Themed } from "@/components/Shell";

export default function NotFound() {
  return (
    <Themed theme="itc">
      <main className="cms-auth">
        <div className="cms-auth-card">
          <h1>Not found</h1>
          <p>There&rsquo;s nothing at this address. It may have been renamed or deleted.</p>
          <p><Link href="/" className="cms-link">Back to your spaces</Link></p>
        </div>
      </main>
    </Themed>
  );
}
