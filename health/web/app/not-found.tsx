import Link from "next/link";
import { CollectiveBar } from "@/components/CollectiveBar";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <>
      <main id="main" className="wrap">
        <div className="page-head" style={{ borderBottom: "none" }}>
          <p className="kicker">404</p>
          <h1>There is nothing at this address.</h1>
          <p className="lede">The page may have moved, or it may never have existed.</p>
          <p className="cta"><Link className="btn" href="/">Back to ITC Health</Link></p>
        </div>
      </main>
      <CollectiveBar current="health" />
    </>
  );
}
