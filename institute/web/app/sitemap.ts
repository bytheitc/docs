import type { MetadataRoute } from "next";
import { house } from "@/lib/houses";
import { generateStaticParams as params0 } from "./(site)/centers/[slug]/page";
import { generateStaticParams as params1 } from "./(site)/fellowships/[slug]/page";
import { generateStaticParams as params2 } from "./(site)/proceedings/[year]/page";

// Every public page. Static routes are listed here; entry pages come from the same
// generateStaticParams their pages use, so a published entry appears here when it goes live.
// Add a new static page to STATIC when you create it (`node scripts/preflight.mjs --static`, run in CI, flags
// pages missing from this list).
export const revalidate = 3600;

const STATIC = [
  "",
  "/calendar",
  "/centers",
  "/fellowships",
  "/people",
  "/proceedings",
  "/propose"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = house("institute").url.replace(/\/+$/, "");
  const paths = [
    ...STATIC,
    ...(await params0()).map((p) => `/centers/${encodeURIComponent(String(p.slug))}`),
    ...(await params1()).map((p) => `/fellowships/${encodeURIComponent(String(p.slug))}`),
    ...(await params2()).map((p) => `/proceedings/${encodeURIComponent(String(p.year))}`),
  ];
  return paths.map((p) => ({ url: `${base}${p}` }));
}
