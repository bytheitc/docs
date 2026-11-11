import type { ReactNode } from "react";

// A small, quiet label that marks content as placeholder until real content is swapped in.
export function Placeholder({ children = "Placeholder" }: { children?: ReactNode }) {
  return <span className="placeholder-tag">{children}</span>;
}
