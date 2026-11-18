import type { MetadataRoute } from "next";
import { house } from "@/lib/houses";
import { generateStaticParams as params0 } from "./(site)/projects/[slug]/page";
import { generateStaticParams as params1 } from "./(site)/sprints/[slug]/page";

// Every public page. Static routes are listed here; entry pages come from the same
// generateStaticParams their pages use, so a published entry appears here when it goes live.
// Add a new static page to STATIC when you create it (`node scripts/preflight.mjs --static`, run in CI, flags
// pages missing from this list).
export const revalidate = 3600;

const STATIC = [
  "",
  "/code-of-conduct",
  "/contribute",
  "/contributors",
  "/governance",
  "/projects",
  "/sprints"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = house("oss").url.replace(/\/+$/, "");
  const paths = [
    ...STATIC,
    ...(await params0()).map((p) => `/projects/${encodeURIComponent(String(p.slug))}`),
    ...(await params1()).map((p) => `/sprints/${encodeURIComponent(String(p.slug))}`),
  ];
  return paths.map((p) => ({ url: `${base}${p}` }));
}
