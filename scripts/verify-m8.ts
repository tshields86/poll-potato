/**
 * M8 verifier — runs against a deployed Cloudflare Worker.
 *
 *   PP_BASE_URL=https://app.pollpotato.com npx tsx scripts/verify-m8.ts
 *
 * For the initial *.workers.dev deploy (before custom domains), point
 * PP_BASE_URL at that URL — the hostname-redirect assertions will be skipped
 * automatically because they only fire on the production hostnames.
 */
export {};

const baseUrl = (process.env.PP_BASE_URL ?? "http://localhost:3344").replace(/\/$/, "");
const SITE_URL = process.env.PP_SITE_URL ?? "https://pollpotato.com";
const APP_URL = process.env.PP_APP_URL ?? "https://app.pollpotato.com";

const usingCustomDomains =
  baseUrl === SITE_URL || baseUrl === APP_URL;

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
  // 1. Landing page renders on the public URL.
  {
    const res = await fetch(`${baseUrl}/`, { redirect: "manual" });
    // On workers.dev the landing is reachable directly; on the marketing
    // hostname it is the canonical home; on the app hostname it 308s.
    if (baseUrl === APP_URL) {
      assert(res.status === 308 || res.status === 301, "GET / on app host → permanent redirect");
      const loc = res.headers.get("location") ?? "";
      assert(loc.startsWith(SITE_URL), "redirect targets marketing host");
    } else {
      assert(res.status === 200, "GET / → 200");
      const html = await res.text();
      assert(html.includes("Settle it."), "landing headline rendered");
      assert(html.includes("Start a poll"), "Start a poll CTA rendered");
      assert(html.includes("<svg"), "mascot SVG rendered");
    }
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
    const res = await fetch(`${baseUrl}/auth/sign-in`, { redirect: "manual" });
    // On marketing host this 308s to app host; everywhere else it's a 200.
    if (baseUrl === SITE_URL) {
      assert(res.status === 308 || res.status === 301, "/auth/sign-in on marketing host → app host");
      const loc = res.headers.get("location") ?? "";
      assert(loc.startsWith(APP_URL), "redirect targets app host");
    } else {
      assert(res.status === 200, "/auth/sign-in → 200");
      const html = await res.text();
      assert(html.toLowerCase().includes("sign in"), "sign-in form rendered");
    }
  }

  // ─────────────────────────────────────────────
  // 4. Hostname canonicalization is deferred to M9 polish — see
  //    next.config.ts for why next.config.ts redirects with host matchers
  //    are unreliable. For M8 both hostnames simply serve the app.
  skip(
    "hostname canonicalization",
    "deferred to M9; both hostnames serve the full app",
  );

  // ─────────────────────────────────────────────
  // 5. End-to-end create→share→vote→results.
  //
  // Sign-in-gated; can't be automated headlessly without driving the auth
  // flow. Run the manual smoke listed in DEPLOYMENT.md §3 before declaring
  // M8 done.
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
