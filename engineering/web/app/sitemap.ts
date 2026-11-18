import type { MetadataRoute } from "next";
import { house } from "@/lib/houses";
import { generateStaticParams as params0 } from "./(site)/blog/[slug]/page";
import { generateStaticParams as params1 } from "./(site)/handbook/[slug]/page";
import { generateStaticParams as params2 } from "./(site)/platforms/[slug]/page";
import { generateStaticParams as params3 } from "./(site)/rfcs/[id]/page";
import { generateStaticParams as params4 } from "./(site)/teams/[slug]/page";

// Every public page. Static routes are listed here; entry pages come from the same
// generateStaticParams their pages use, so a published entry appears here when it goes live.
// Add a new static page to STATIC when you create it (`node scripts/preflight.mjs --static`, run in CI, flags
// pages missing from this list).
export const revalidate = 3600;

const STATIC = [
  "",
  "/blog",
  "/careers",
  "/handbook",
  "/platforms",
  "/rfcs",
  "/status",
  "/teams"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = house("engineering").url.replace(/\/+$/, "");
  const paths = [
    ...STATIC,
    ...(await params0()).map((p) => `/blog/${encodeURIComponent(String(p.slug))}`),
    ...(await params1()).map((p) => `/handbook/${encodeURIComponent(String(p.slug))}`),
    ...(await params2()).map((p) => `/platforms/${encodeURIComponent(String(p.slug))}`),
    ...(await params3()).map((p) => `/rfcs/${encodeURIComponent(String(p.id))}`),
    ...(await params4()).map((p) => `/teams/${encodeURIComponent(String(p.slug))}`),
  ];
  return paths.map((p) => ({ url: `${base}${p}` }));
}
