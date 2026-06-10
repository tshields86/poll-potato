/**
 * M8 verifier — runs against a deployed Cloudflare Worker.
 *
 *   PP_BASE_URL=https://app.pollpotato.com npx tsx scripts/verify-m8.ts
 *   PP_BASE_URL=https://pollpotato.com    npx tsx scripts/verify-m8.ts
 *   PP_BASE_URL=https://<...>.workers.dev npx tsx scripts/verify-m8.ts
 *
 * Hostname canonicalization (forcing each route group onto a specific
 * subdomain) is deferred to M9 — for M8 both hostnames serve the full app,
 * so the verifier just checks that whichever host you point it at returns
 * the right surfaces.
 */
export {};

const baseUrl = (process.env.PP_BASE_URL ?? "http://localhost:3344").replace(/\/$/, "");

function assert(cond: unknown, label: string) {
  if (!cond) throw new Error(`✗ ${label}`);
  console.log(`✓ ${label}`);
}

function skip(label: string, reason: string) {
  console.log(`↷ ${label} (skipped — ${reason})`);
}

async function main() {
  console.log(`M8 verification against ${baseUrl}\n`);

  // ─────────────────────────────────────────────
  // 1. Marketing landing renders on whichever host we point at.
  {
    const res = await fetch(`${baseUrl}/`);
    assert(res.status === 200, "GET / → 200");
    const html = await res.text();
    assert(html.includes("Settle it."), "landing headline rendered");
    assert(html.includes("Start a poll"), "Start a poll CTA rendered");
    assert(html.includes("<svg"), "mascot SVG rendered");
  }

  // ─────────────────────────────────────────────
  // 2. Static SEO assets reachable.
  {
    const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
    assert(sitemap.status === 200, "sitemap.xml → 200");
    const sm = await sitemap.text();
    assert(sm.includes("<urlset"), "sitemap.xml is XML urlset");

    const robots = await fetch(`${baseUrl}/robots.txt`);
    assert(robots.status === 200, "robots.txt → 200");
    const rb = await robots.text();
    assert(rb.toLowerCase().includes("sitemap"), "robots references sitemap");
  }

  // ─────────────────────────────────────────────
  // 3. Sign-in surface served from the deployed Worker.
  {
    const res = await fetch(`${baseUrl}/auth/sign-in`);
    assert(res.status === 200, "/auth/sign-in → 200");
    const html = await res.text();
    assert(html.toLowerCase().includes("sign in"), "sign-in form rendered");
  }

  // ─────────────────────────────────────────────
  // 4. Hostname canonicalization deferred to M9 — see next.config.ts.
  skip(
    "hostname canonicalization",
    "deferred to M9; both hostnames serve the full app",
  );

  // ─────────────────────────────────────────────
  // 5. End-to-end create→share→vote→results.
  //
  // Sign-in-gated; can't be automated headlessly without driving the auth
  // flow. Run the manual smoke listed in DEPLOYMENT.md §3.
  skip(
    "end-to-end create→share→vote→results",
    "manual smoke — see DEPLOYMENT.md §3",
  );

  console.log("\nM8 acceptance check: PASS (automated portion)");
  console.log(
    "Remember to also run the manual end-to-end smoke from DEPLOYMENT.md.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nM8 acceptance check: FAIL");
    console.error(err);
    process.exit(1);
  });
