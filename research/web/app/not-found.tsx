import type { Metadata } from "next";
import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { CollectiveBar } from "@/components/CollectiveBar";

export const metadata: Metadata = {
  title: "Not in the archive",
};

export default function NotFound() {
  return (
    <>
    <Masthead />
    <main id="main" tabIndex={-1}>
    <div className="page">
      <section className="erratum" aria-labelledby="err-h">
        <p className="feat-label">Erratum · Error 404</p>
        <h1 id="err-h">This page could not be located in the archive.</h1>
        <div className="erratum-body">
          <p>
            The reference you followed points to an item that is not held here. It may have been moved or
            renumbered, or it may never have been deposited. Identifiers at ITC Research are never reused, so an
            address that once worked should not now point to something else.
          </p>
          <p className="erratum-note"><b>For:</b> the page requested. <b>Read:</b> one of the following.</p>
          <ul className="plain-list">
            <li><Link href="/publications">The full index of publications</Link></li>
            <li><Link href="/datasets">Datasets and their datasheets</Link></li>
            <li><Link href="/notes">Working notes</Link></li>
            <li><Link href="/">The front page</Link></li>
          </ul>
          <p className="side-note">If you believe this is our error, write to <a href="mailto:corrections@example.org">corrections@example.org</a> and we will correct it.</p>
        </div>
      </section>
    </div>
    </main>
    <CollectiveBar current="research" />
    </>
  );
}
