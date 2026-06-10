/**
 * Seed three M9-I edge-case polls (long content, many options, emojis).
 * Appends to the existing seed; safe to run multiple times — re-seeds by slug.
 *
 *   npm run db:seed-edge
 */
import { inArray } from "drizzle-orm";
import { db, poll, pollOption } from "../lib/db";

const EDGE_SLUGS = ["edge-long", "edge-many", "edge-emoji"];

async function main() {
  console.log("Seeding edge-case polls…");

  // Wipe these three slugs before re-inserting so the script is idempotent.
  // Cascades drop their options and votes.
  await db.delete(poll).where(inArray(poll.slug, EDGE_SLUGS));

  // ───────────────────────────────────────────────────────────────
  // 1. Long content — 220-char question, long option labels
  const [longPoll] = await db
    .insert(poll)
    .values({
      slug: "edge-long",
      question:
        "If our team had unlimited budget and three full uninterrupted days, what would be the single highest-leverage thing we could do together as a group to set the next quarter up for real, lasting, measurable success — pick exactly one?",
      creatorToken: "seed-edge-long",
    })
    .returning();
  await db.insert(pollOption).values([
    {
      pollId: longPoll.id,
      label:
        "Run a focused customer-discovery sprint with twenty interviews across our top three personas and synthesize a written brief by end of day three.",
      position: 0,
    },
    {
      pollId: longPoll.id,
      label:
        "Lock ourselves in a room and ship a single end-to-end demo of the entire user journey from sign-up through first invoice — no scope creep allowed.",
      position: 1,
    },
    {
      pollId: longPoll.id,
      label:
        "Audit every dashboard, alert, and runbook we have; delete the dead ones, fix the noisy ones, and document the survivors.",
      position: 2,
    },
    { pollId: longPoll.id, label: "Touch grass.", position: 3 },
  ]);

  // ───────────────────────────────────────────────────────────────
  // 2. Many options — 20 sortable items
  const [manyPoll] = await db
    .insert(poll)
    .values({
      slug: "edge-many",
      question: "Pick a favorite — go.",
      allowMultiple: true,
      creatorToken: "seed-edge-many",
    })
    .returning();
  const animals = [
    "Otter",
    "Octopus",
    "Capybara",
    "Pangolin",
    "Quokka",
    "Axolotl",
    "Red panda",
    "Sloth",
    "Narwhal",
    "Fennec fox",
    "Pufferfish",
    "Manatee",
    "Tapir",
    "Wombat",
    "Hedgehog",
    "Hummingbird",
    "Sea otter",
    "Platypus",
    "Mandrill",
    "Aardvark",
  ];
  await db.insert(pollOption).values(
    animals.map((label, i) => ({
      pollId: manyPoll.id,
      label,
      position: i,
    })),
  );

  // ───────────────────────────────────────────────────────────────
  // 3. Emoji-heavy + single-char content
  const [emojiPoll] = await db
    .insert(poll)
    .values({
      slug: "edge-emoji",
      question: "🍕🌮🍣🍔 — pick one",
      creatorToken: "seed-edge-emoji",
    })
    .returning();
  await db.insert(pollOption).values([
    { pollId: emojiPoll.id, label: "🍕", position: 0 },
    { pollId: emojiPoll.id, label: "🌮", position: 1 },
    { pollId: emojiPoll.id, label: "🍣", position: 2 },
    { pollId: emojiPoll.id, label: "🍔", position: 3 },
    { pollId: emojiPoll.id, label: "A", position: 4 },
  ]);

  console.log("Done. Seeded:");
  for (const s of EDGE_SLUGS) console.log(`  /p/${s}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
