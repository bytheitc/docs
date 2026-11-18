"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavSection } from "@/lib/api";

import { hrefOf } from "@/lib/href";

export function Sidebar({ sections }: { sections: NavSection[] }) {
  const path = usePathname();
  return (
    <nav id="side" className="side" aria-label="Docs" data-open="false">
      {sections.map((s) => (
        <div key={s.title}>
          <h4>{s.title}</h4>
          <ul>
            {s.pages.map((p) => {
              const href = hrefOf(p.slug);
              return (
                <li key={p.slug}>
                  <Link href={href} aria-current={path === href ? "page" : undefined}>{p.title}</Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
