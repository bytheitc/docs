"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Khatam } from "@/components/Khatam";

const LINKS = [{ href: "/idea", label: "The idea" }];

export function Masthead() {
  const path = usePathname();
  return (
    <header className="masthead">
      <div className="masthead-in">
        <Link href="/" className="brand" aria-label="ITC Health, home">
          {/* The shared star; only the centre is this house's (BRAND.md, rule 1). */}
          <Khatam variant="health" className="mark" />
          <span>
            <span className="brand-name">Health</span>
            <span className="brand-sub">Islamic Tech Collective</span>
          </span>
        </Link>
        <nav aria-label="ITC Health">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
