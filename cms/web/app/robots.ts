import type { MetadataRoute } from "next";

// Staff tool: nothing here belongs in a search index.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
