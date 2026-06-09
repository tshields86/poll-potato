import { eq, sql } from "drizzle-orm";
import { db, poll, pollOption, vote } from "../lib/db";

async function main() {
  console.log("Seeding…");

  // Wipe in dependency order. Cascades handle children, but explicit is friendlier.
  await db.delete(vote);
  await db.delete(pollOption);
  await db.delete(poll);

  // Poll 1: open, single-choice, hide results until voted, auto-closes in 2 days.
  const closesAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const [offsite] = await db
    .insert(poll)
    .values({
      slug: "team-offsite",
      question: "Where should we do the offsite?",
      hideResults: true,
      closesAt,
      creatorToken: "seed-creator-1",
    })
    .returning();

  const offsiteOptions = await db
    .insert(pollOption)
    .values([
      { pollId: offsite.id, label: "Lake cabin", position: 0 },
      { pollId: offsite.id, label: "Beach house", position: 1 },
      { pollId: offsite.id, label: "City loft", position: 2 },
      { pollId: offsite.id, label: "Mountain lodge", position: 3 },
    ])
    .returning();

  // Drop a few anonymous votes on the mountain lodge to give it a lead.
  const mountainLodge = offsiteOptions.find((o) => o.label === "Mountain lodge")!;
  const beachHouse = offsiteOptions.find((o) => o.label === "Beach house")!;
  await db.insert(vote).values([
    {
      pollId: offsite.id,
      optionId: mountainLodge.id,
      voterToken: "seed-voter-a",
      voterName: "Alex",
    },
    {
      pollId: offsite.id,
      optionId: mountainLodge.id,
      voterToken: "seed-voter-b",
      voterName: "Sam",
    },
    {
      pollId: offsite.id,
      optionId: beachHouse.id,
      voterToken: "seed-voter-c",
      voterName: "Jordan",
    },
  ]);
  await db
    .update(pollOption)
    .set({ voteCount: sql`${pollOption.voteCount} + 2` })
    .where(eq(pollOption.id, mountainLodge.id));
  await db
    .update(pollOption)
    .set({ voteCount: sql`${pollOption.voteCount} + 1` })
    .where(eq(pollOption.id, beachHouse.id));

  // Poll 2: closed final results.
  const [pizza] = await db
    .insert(poll)
    .values({
      slug: "best-pizza-topping",
      question: "Best pizza topping — settle it.",
      status: "closed",
      creatorToken: "seed-creator-2",
    })
    .returning();

  const pizzaOptions = await db
    .insert(pollOption)
    .values([
      { pollId: pizza.id, label: "Pepperoni", position: 0, voteCount: 65 },
      { pollId: pizza.id, label: "Mushroom", position: 1, voteCount: 44 },
      { pollId: pizza.id, label: "Pineapple", position: 2, voteCount: 30 },
      { pollId: pizza.id, label: "Plain cheese", position: 3, voteCount: 17 },
    ])
    .returning();

  console.log(
    `Seeded ${offsiteOptions.length + pizzaOptions.length} options across 2 polls.`,
  );
  console.log("Share URLs:");
  console.log(`  /${offsite.slug}`);
  console.log(`  /${pizza.slug}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
