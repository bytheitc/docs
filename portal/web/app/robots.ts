import type { MetadataRoute } from "next";
import { PORTAL_URL } from "@/lib/houses";

export default function robots(): MetadataRoute.Robots {
  const base = PORTAL_URL.replace(/\/+$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/","/dashboard","/staff","/sign-in","/claim","/maintainers/claims"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
