import type { MetadataRoute } from "next";
import { getSearchIndex } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_DOCS_URL ?? "http://localhost:3011";
  return (await getSearchIndex()).map((p) => ({ url: p.slug === "index" ? site : `${site}/${p.slug}` }));
}
