"use client";

import { useState } from "react";
import { bibtex, type Publication } from "@/lib/publications";

export function CiteButton({ pub, label = "Cite" }: { pub: Publication; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(bibtex(pub));
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1800);
  }
  return (
    <button type="button" className="cite" onClick={copy} aria-live="polite">
      {state === "copied" ? "BibTeX copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
