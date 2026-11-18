import Link from "next/link";
import { Search } from "./Search";
import { ThemeToggle } from "./ThemeToggle";
import { MenuButton } from "./MenuButton";

const PORTAL = process.env.NEXT_PUBLIC_ITC_PORTAL_URL ?? "https://portal.bytheitc.xyz";

export function Header({ withMenu = true }: { withMenu?: boolean }) {
  return (
    <header className="top">
      {withMenu && <MenuButton />}
      <Link href="/" className="brand" aria-label="ITC Docs, home">
        <img src="/itc-mark.svg" alt="" width={30} height={30} />
        <b>ITC <span className="slash">/</span> Docs</b>
        <span className="ar" lang="ar" aria-hidden="true">دليل</span>
      </Link>
      <span className="grow" />
      <Search />
      <nav className="top-links" aria-label="Elsewhere">
        <a className="hide-sm" href={PORTAL}>Portal</a>
        <a className="hide-sm" href="https://github.com/bytheitc" target="_blank" rel="noopener noreferrer">GitHub</a>
        <ThemeToggle />
      </nav>
    </header>
  );
}
