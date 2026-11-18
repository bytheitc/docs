import type { MetadataRoute } from "next";
import { house } from "@/lib/houses";

// Every public page. Static routes are listed here; entry pages come from the same
// generateStaticParams their pages use, so a published entry appears here when it goes live.
// Add a new static page to STATIC when you create it (`node scripts/preflight.mjs --static`, run in CI, flags
// pages missing from this list).
export const revalidate = 3600;

const STATIC = [
  "",
  "/idea"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = house("health").url.replace(/\/+$/, "");
  const paths = [
    ...STATIC,

  ];
  return paths.map((p) => ({ url: `${base}${p}` }));
}
