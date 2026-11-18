import type { MetadataRoute } from "next";
import { house } from "@/lib/houses";
import { generateStaticParams as params0 } from "./(site)/datasets/[slug]/page";
import { generateStaticParams as params1 } from "./(site)/groups/[slug]/page";
import { generateStaticParams as params2 } from "./(site)/notes/[slug]/page";
import { generateStaticParams as params3 } from "./(site)/publications/[id]/page";

// Every public page. Static routes are listed here; entry pages come from the same
// generateStaticParams their pages use, so a published entry appears here when it goes live.
// Add a new static page to STATIC when you create it (`node scripts/preflight.mjs --static`, run in CI, flags
// pages missing from this list).
export const revalidate = 3600;

const STATIC = [
  "",
  "/datasets",
  "/groups",
  "/notes",
  "/open-science",
  "/people",
  "/publications"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = house("research").url.replace(/\/+$/, "");
  const paths = [
    ...STATIC,
    ...(await params0()).map((p) => `/datasets/${encodeURIComponent(String(p.slug))}`),
    ...(await params1()).map((p) => `/groups/${encodeURIComponent(String(p.slug))}`),
    ...(await params2()).map((p) => `/notes/${encodeURIComponent(String(p.slug))}`),
    ...(await params3()).map((p) => `/publications/${encodeURIComponent(String(p.id))}`),
  ];
  return paths.map((p) => ({ url: `${base}${p}` }));
}
