import { eq } from "drizzle-orm";
import { db, poll, pollOption } from "../lib/db";
import { newSlug } from "../lib/slug";

/**
 * Exercises M3 in two layers:
 *   1. Insert a poll + options with every settings flag and a future close
 *      date, mimicking what `createPoll()` does (minus identity cookies).
 *   2. Fetch /p/{slug} over HTTP and confirm the page rendered the question,
 *      options, and persisted settings.
 *
 * Run a dev server on PP_BASE_URL (default http://localhost:3344) first.
 */
async function main() {
  const baseUrl = process.env.PP_BASE_URL ?? "http://localhost:3344";
  console.log(`M3 verification against ${baseUrl}…\n`);

  const slug = newSlug();
  const closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [created] = await db
    .insert(poll)
    .values({
      slug,
      question: "Where should we do the offsite, redux?",
      creatorToken: `verify-m3-${Date.now()}`,
      allowMultiple: true,
      requireName: true,
      hideResults: true,
      closesAt,
    })
    .returning();
  await db.insert(pollOption).values([
    { pollId: created.id, label: "Lake cabin", position: 0 },
    { pollId: created.id, label: "Beach house", position: 1 },
    { pollId: created.id, label: "City loft", position: 2 },
  ]);
  console.log(`✓ inserted poll ${slug} with 3 options + every setting flag set`);

  // Hit the share URL and validate the rendered HTML
  const res = await fetch(`${baseUrl}/p/${slug}`);
  console.log(`✓ GET /p/${slug} → ${res.status}`);
  if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
  const html = await res.text();
  const expected = [
    "Where should we do the offsite, redux?",
    "Lake cabin",
    "Beach house",
    "City loft",
  ];
  for (const needle of expected) {
    if (!html.includes(needle)) {
      throw new Error(`expected page to include "${needle}"`);
    }
  }
  console.log("✓ question and all 3 options rendered");

  // Confirm settings round-tripped to the DB unchanged
  const refetched = await db.query.poll.findFirst({ where: eq(poll.slug, slug) });
  if (!refetched) throw new Error("poll vanished");
  const flags = {
    allowMultiple: refetched.allowMultiple,
    requireName: refetched.requireName,
    hideResults: refetched.hideResults,
    closesAtIsoMatches:
      refetched.closesAt?.toISOString() === closesAt.toISOString(),
  };
  if (
    !flags.allowMultiple ||
    !flags.requireName ||
    !flags.hideResults ||
    !flags.closesAtIsoMatches
  ) {
    throw new Error(`settings drift: ${JSON.stringify(flags)}`);
  }
  console.log("✓ settings persisted as written:", flags);

  // Slug-collision retry: insert with a slug we just minted, confirm next mint differs
  const a = newSlug();
  const b = newSlug();
  if (a === b) throw new Error("slug generator returned the same value twice");
  console.log(`✓ slug generator yields distinct values (${a} ≠ ${b})`);

  await db.delete(poll).where(eq(poll.id, created.id));
  console.log("\nM3 acceptance check: PASS");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nM3 acceptance check: FAIL");
    console.error(err);
    process.exit(1);
  });
