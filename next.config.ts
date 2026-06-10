import type { NextConfig } from "next";

// Single Worker serves both hostnames. These redirects canonicalize each route
// to its intended subdomain — none of them match on localhost, so dev is
// unaffected. Hostnames are matched literally; www handling is M9 polish.
const MARKETING_HOST = "pollpotato.com";
const APP_HOST = "app.pollpotato.com";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // App, results, and auth routes hit on the marketing host → app subdomain.
      {
        source: "/app/:path*",
        has: [{ type: "host", value: MARKETING_HOST }],
        destination: `https://${APP_HOST}/app/:path*`,
        permanent: true,
      },
      {
        source: "/p/:path*",
        has: [{ type: "host", value: MARKETING_HOST }],
        destination: `https://${APP_HOST}/p/:path*`,
        permanent: true,
      },
      {
        source: "/auth/:path*",
        has: [{ type: "host", value: MARKETING_HOST }],
        destination: `https://${APP_HOST}/auth/:path*`,
        permanent: true,
      },
      // Marketing landing hit on the app host → marketing domain (canonical).
      {
        source: "/",
        has: [{ type: "host", value: APP_HOST }],
        destination: `https://${MARKETING_HOST}/`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
