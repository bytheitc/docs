import Link from "next/link";
import { Khatam } from "@/components/Khatam";
import { house } from "@/lib/houses";
import { FOOTER_NAV } from "@/lib/nav";

// The Collective's own site map. Sits directly above the shared Collective bar.
export function SiteFooter() {
  const self = house("site");
  return (
    <div className="site-footer">
      <div className="sf-inner">
        <div className="sf-brand">
          <Khatam variant="site" className="sf-mark" strokeWidth={5} accent="var(--gold)" />
          <p className="sf-ar"><span lang="ar">{self.arabic}</span> <span>{self.transliteration} · {self.sense}</span></p>
          <p className="sf-line">Technology, built with intention, in service of people.</p>
        </div>
        {FOOTER_NAV.filter((col) => col.links.length > 0).map((col) => (
          <nav key={col.heading} aria-label={col.heading} className="sf-col">
            <h2>{col.heading}</h2>
            <ul>
              {col.links.map((l) => (
                <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </div>
  );
}
