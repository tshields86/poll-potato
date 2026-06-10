import type { NextConfig } from "next";

// Hostname canonicalization (pollpotato.com ↔ app.pollpotato.com) lives in
// M9 polish — Next's `has: { type: "host", value }` matcher treats `value`
// as an unanchored regex, so a literal hostname there matches subdomains
// too and produces a redirect loop. The right place is a Worker-level
// rewrite, not next.config.ts.
const nextConfig: NextConfig = {};

export default nextConfig;
