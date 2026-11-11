"use client";

import { usePathname } from "next/navigation";

// Shows the path the visitor asked for inside the 404 "conversation".
export function UnknownPath() {
  const pathname = usePathname();
  return <>{pathname ?? "this page"}</>;
}
