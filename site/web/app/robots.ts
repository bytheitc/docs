import type { MetadataRoute } from "next";
import { house } from "@/lib/houses";

export default function robots(): MetadataRoute.Robots {
  const base = house("site").url.replace(/\/+$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/","/newsletter/confirm","/newsletter/preferences"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
