import type { MetadataRoute } from "next";

const SITE_URL = process.env.PP_SITE_URL ?? "https://pollpotato.com";
const APP_URL = process.env.PP_APP_URL ?? "https://app.pollpotato.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${APP_URL}/app/create`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
