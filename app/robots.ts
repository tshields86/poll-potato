import type { MetadataRoute } from "next";

const SITE_URL = process.env.PP_SITE_URL ?? "https://pollpotato.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Auth surfaces and per-poll vote pages don't need to be crawled.
        disallow: ["/api/", "/auth/", "/app/", "/p/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
