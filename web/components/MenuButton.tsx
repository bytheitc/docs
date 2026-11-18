"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Opens the sidebar as a drawer on narrow screens. */
export function MenuButton() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.getElementById("side")?.setAttribute("data-open", String(open));
  }, [open]);
  return (
    <button type="button" className="icon-btn menu-btn" aria-controls="side" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
      </svg>
      <span className="sr">Menu</span>
    </button>
  );
}
