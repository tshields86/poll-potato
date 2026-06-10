import type { MetadataRoute } from "next";

const SITE_URL = process.env.PP_SITE_URL ?? "https://pollpotato.com";

// Only marketing URLs belong here. The app subdomain (app.pollpotato.com)
// is intentionally noindex — see robots.ts and the (app)/layout metadata.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
