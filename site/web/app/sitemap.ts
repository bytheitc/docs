import type { MetadataRoute } from "next";
import { house } from "@/lib/houses";
import { isVisible } from "@/lib/visibility";
import { generateStaticParams as params0 } from "./(site)/events/[slug]/page";
import { generateStaticParams as params1 } from "./(site)/news/[slug]/page";
import { generateStaticParams as params2 } from "./(site)/products/[slug]/page";
import { generateStaticParams as params3 } from "./(site)/rfps/[slug]/page";

// Every public page. Static routes are listed here; entry pages come from the same
// generateStaticParams their pages use, so a published entry appears here when it goes live.
// Add a new static page to STATIC when you create it (`node scripts/preflight.mjs --static`, run in CI, flags
// pages missing from this list).
export const revalidate = 3600;

const STATIC = [
  "",
  "/about",
  "/brand",
  "/contact",
  "/donate",
  "/events",
  "/faq",
  "/first-hundred",
  "/houses",
  "/join",
  "/mobile",
  "/news",
  "/newsletter",
  "/press",
  "/privacy",
  "/products",
  "/rfps",
  "/suggest",
  "/team",
  "/terms"
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = house("site").url.replace(/\/+$/, "");
  const paths = [
    ...STATIC,
    ...(await params0()).map((p) => `/events/${encodeURIComponent(String(p.slug))}`),
    ...(await params1()).map((p) => `/news/${encodeURIComponent(String(p.slug))}`),
    ...(await params2()).map((p) => `/products/${encodeURIComponent(String(p.slug))}`),
    ...(await params3()).map((p) => `/rfps/${encodeURIComponent(String(p.slug))}`),
  ];
  // During the soft launch only pages the middleware lets through are listed.
  return paths.filter((p) => isVisible(p || "/")).map((p) => ({ url: `${base}${p}` }));
}
