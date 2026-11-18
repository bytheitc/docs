import type { MetadataRoute } from "next";
import { house } from "@/lib/houses";

export default function robots(): MetadataRoute.Robots {
  const base = house("oss").url.replace(/\/+$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/","/account"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
