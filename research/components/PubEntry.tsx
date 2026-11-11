import Link from "next/link";
import { CiteButton } from "@/components/CiteButton";
import type { Publication } from "@/lib/publications";

/** One entry in a publication list. Usable from server and client components. */
export function PubEntry({ p, showGroup = true }: { p: Publication; showGroup?: boolean }) {
  const href = `/publications/${p.id}`;
  return (
    <li className="pub">
      <div className="pub-meta">
        <span className="pub-type">{p.type}</span>
        <span>{p.year}</span>
        <span className="pub-id">{p.id}</span>
      </div>
      <h3><Link href={href}>{p.title}</Link></h3>
      {showGroup && <p className="pub-group">{p.group} Group</p>}
      <p className="pub-sum">{p.summary}</p>
      <div className="pub-foot">
        <span className="tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</span>
        <span className="actions">
          <Link href={`${href}#pdf`} title="PDF not yet deposited: see placeholder on the publication page">PDF <span className="pending-mark">pending</span></Link>
          <CiteButton pub={p} />
        </span>
      </div>
    </li>
  );
}
