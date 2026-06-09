import { eq } from "drizzle-orm";
import { db, poll, vote } from "../lib/db";

async function main() {
  console.log("FK verification…\n");

  // 1. Insert a vote with a bogus user_id should now fail
  const offsite = await db.query.poll.findFirst({
    where: eq(poll.slug, "team-offsite"),
  });
  if (!offsite) throw new Error("team-offsite poll missing");
  const firstOption = await db.query.pollOption.findFirst({
    where: (o, { eq }) => eq(o.pollId, offsite.id),
  });
  if (!firstOption) throw new Error("offsite has no options");

  let rejected = false;
  try {
    await db.insert(vote).values({
      pollId: offsite.id,
      optionId: firstOption.id,
      userId: "00000000-0000-0000-0000-000000000001",
    });
  } catch (err) {
    rejected = true;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`✓ vote with non-existent user_id rejected — ${msg.split("\n")[0]}`);
  }
  if (!rejected) {
    throw new Error("EXPECTED FK to reject bogus user_id, but insert succeeded");
  }

  // 2. NULL user_id (anonymous vote) should still work
  await db.insert(vote).values({
    pollId: offsite.id,
    optionId: firstOption.id,
    voterToken: `verify-fk-${Date.now()}`,
  });
  console.log("✓ anonymous vote (null user_id) still accepted");

  // 3. Clean up
  await db.delete(vote).where(eq(vote.voterToken, `verify-fk-${Date.now()}`));

  console.log("\nFK acceptance check: PASS");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nFK acceptance check: FAIL");
    console.error(err);
    process.exit(1);
  });
