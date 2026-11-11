import Link from "next/link";
import { Khatam } from "@/components/Khatam";
import { MastheadNav } from "@/components/MastheadNav";
import { house } from "@/lib/houses";

/** Periodical masthead shared by every page of ITC Research. */
export function Masthead() {
  const self = house("research");
  return (
    <header className="masthead">
      <a href="#main" className="skip">Skip to content</a>
      <div className="mh-top">
        <span>Islamic Tech Collective</span>
        <span>Papers · Datasets · Working notes</span>
        <span>Open access</span>
      </div>
      <div className="mh-title">
        <Khatam variant="research" className="mark" strokeWidth={4} accent="var(--accent)" />
        <Link href="/" className="mh-name">ITC Research</Link>
        <span className="mh-ar" lang="ar" title={`${self.transliteration}: ${self.sense}`}>
          {self.arabic}
          <span className="mh-tr" lang="en">{self.transliteration} · {self.sense}</span>
        </span>
      </div>
      <MastheadNav />
    </header>
  );
}
