import type { MetadataRoute } from "next";
import { house } from "@/lib/houses";

export default function robots(): MetadataRoute.Robots {
  const base = house("engineering").url.replace(/\/+$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
