import Link from "next/link";

interface Crumb { href: string; label: string }

/** Title block for inner pages: running head, title, standfirst, closed by a double rule. */
export function PageHead({ kicker, title, lede, crumbs = [], children }: {
  kicker: string; title: string; lede?: string; crumbs?: Crumb[]; children?: React.ReactNode;
}) {
  return (
    <header className="page-head">
      {crumbs.length > 0 && (
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Research</Link>
          {crumbs.map((c) => <span key={c.href}> / <Link href={c.href}>{c.label}</Link></span>)}
        </nav>
      )}
      <p className="feat-label">{kicker}</p>
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </header>
  );
}
