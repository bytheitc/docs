"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { IndexLink } from "@/lib/content";

// Pages declare their "on this page" sections with <PageIndex sections={…} />.
// The site sidebar (rendered once in the root layout) reads them from this context.

type Ctx = { sections: IndexLink[]; setSections: (s: IndexLink[]) => void };
const PageIndexContext = createContext<Ctx>({ sections: [], setSections: () => {} });

export function PageIndexProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<IndexLink[]>([]);
  return <PageIndexContext.Provider value={{ sections, setSections }}>{children}</PageIndexContext.Provider>;
}

export const usePageIndex = () => useContext(PageIndexContext).sections;

export function PageIndex({ sections }: { sections: IndexLink[] }) {
  const { setSections } = useContext(PageIndexContext);
  const key = JSON.stringify(sections);
  useEffect(() => {
    setSections(JSON.parse(key) as IndexLink[]);
    return () => setSections([]);
  }, [key, setSections]);
  return null;
}
