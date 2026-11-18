import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_DOCS_URL ?? "http://localhost:3011";
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin"] }], sitemap: `${site}/sitemap.xml` };
}
