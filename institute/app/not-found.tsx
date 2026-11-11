import type { Metadata } from "next";
import Link from "next/link";
import { CollectiveBar } from "@/components/CollectiveBar";
import { PageHead } from "@/components/Heads";
import { Masthead } from "@/components/Masthead";

export const metadata: Metadata = {
  title: "Room not found",
};

export default function NotFound() {
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <Masthead />
      <main id="main" tabIndex={-1}>
      <PageHead
        id="not-found"
        arch={{ arabic: "ضالّة", translit: "ḍālla", sense: "something lost, sought after" }}
        kicker="Not found"
        title={<>This room <em>has not been built.</em></>}
        lede={
          <>
            The page you were looking for is not in this house, or it has moved to another room.
            An old saying calls wisdom the <i>ḍālla</i> of the believer: the lost thing one keeps searching for.
            May your search here be easier.
          </>
        }
      />
      <section className="propose">
        <p>Return to the courtyard, or walk through one of the open doors.</p>
        <p className="btn-row">
          <Link className="btn" href="/">The Institute</Link>
          <Link className="btn btn-ghost" href="/centers">The centers</Link>
        </p>
      </section>
      </main>
      <CollectiveBar current="institute" />
    </>
  );
}
