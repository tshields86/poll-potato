const baseUrl = process.env.PP_BASE_URL ?? "http://localhost:3344";

function assert(cond: unknown, label: string) {
  if (!cond) throw new Error(`✗ ${label}`);
  console.log(`✓ ${label}`);
}

async function main() {
  console.log("M7 verification…\n");

  // ─────────────────────────────────────────────
  // 1. Landing page renders with hero copy + CTA
  {
    const res = await fetch(`${baseUrl}/`);
    assert(res.status === 200, "GET / → 200");
    const html = await res.text();
    assert(html.includes("Settle it."), "headline rendered");
    assert(html.includes("Fast."), "highlighted accent word rendered");
    assert(
      html.includes("Spin up a poll in ten seconds"),
      "subhead rendered verbatim",
    );
    assert(
      html.includes("Start a poll") && html.includes('href="/app/create"'),
      "Start a poll CTA links to /app/create",
    );
    assert(
      html.includes("PollPotato") && html.includes("font-display"),
      "wordmark + display font present",
    );
    assert(html.includes("updating live"), "live mini-result strip rendered");
    assert(html.includes("<svg"), "mascot SVG rendered");
  }

  // ─────────────────────────────────────────────
  // 2. Root OG metadata
  {
    const html = await (await fetch(`${baseUrl}/`)).text();
    assert(html.includes('property="og:title"'), "og:title present on landing");
    assert(
      html.includes('property="og:description"'),
      "og:description present on landing",
    );
    assert(
      html.includes('name="twitter:card"') && html.includes("summary_large_image"),
      "twitter:card present on landing",
    );
  }

  // ─────────────────────────────────────────────
  // 3. sitemap.xml + robots.txt resolve correctly
  {
    const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
    assert(sitemap.status === 200, "sitemap.xml → 200");
    const sm = await sitemap.text();
    assert(sm.includes("<urlset"), "sitemap.xml is XML urlset");
    assert(sm.includes("pollpotato.com") || sm.includes("/app/create"), "sitemap references our URLs");

    const robots = await fetch(`${baseUrl}/robots.txt`);
    assert(robots.status === 200, "robots.txt → 200");
    const rb = await robots.text();
    assert(rb.includes("User-Agent") || rb.includes("User-agent"), "robots.txt has user-agent rule");
    assert(rb.includes("Disallow"), "robots.txt declares disallow paths");
    assert(rb.toLowerCase().includes("sitemap"), "robots.txt references sitemap");
  }

  // ─────────────────────────────────────────────
  // 4. Responsive guard: a few key Tailwind classes for mobile-first
  {
    const html = await (await fetch(`${baseUrl}/`)).text();
    assert(
      html.includes("grid") && html.includes("lg:grid-cols-"),
      "hero uses responsive grid (mobile→desktop)",
    );
    assert(
      html.includes('clamp(') || html.includes("max-w-"),
      "fluid widths in play",
    );
  }

  console.log("\nM7 acceptance check: PASS");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nM7 acceptance check: FAIL");
    console.error(err);
    process.exit(1);
  });
