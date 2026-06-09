import { and, eq } from "drizzle-orm";
import { db, poll, pollOption, vote } from "../lib/db";

async function main() {
  console.log("M1 verification…\n");

  // 1. READ poll + ordered options
  const offsite = await db.query.poll.findFirst({
    where: eq(poll.slug, "team-offsite"),
  });
  if (!offsite) throw new Error("team-offsite poll not found");
  const offsiteOptions = await db.query.pollOption.findMany({
    where: eq(pollOption.pollId, offsite.id),
    orderBy: (o, { asc }) => asc(o.position),
  });
  console.log(`✓ read poll "${offsite.question}" with ${offsiteOptions.length} options`);

  const pizza = await db.query.poll.findFirst({
    where: eq(poll.slug, "best-pizza-topping"),
  });
  if (!pizza) throw new Error("pizza poll not found");
  console.log(`✓ read closed poll "${pizza.question}" (status=${pizza.status})`);

  // 2. WRITE a new anonymous vote
  const firstOption = offsiteOptions[0];
  const probeToken = `verify-${Date.now()}`;
  const inserted = await db
    .insert(vote)
    .values({
      pollId: offsite.id,
      optionId: firstOption.id,
      voterToken: probeToken,
      voterName: "Verify Bot",
    })
    .returning();
  console.log(`✓ inserted vote (id=${inserted[0].id.slice(0, 8)}…)`);

  // 3. DUPLICATE — same (poll, voter_token, option) must be rejected
  let duplicateRejected = false;
  try {
    await db.insert(vote).values({
      pollId: offsite.id,
      optionId: firstOption.id,
      voterToken: probeToken,
    });
  } catch (err) {
    duplicateRejected = true;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`✓ duplicate anonymous vote rejected — ${msg.split("\n")[0]}`);
  }
  if (!duplicateRejected) throw new Error("EXPECTED duplicate vote to fail, but it succeeded");

  // 4. Different option WITH the same token must SUCCEED (allow_multiple semantics
  //    are enforced in app code in M4; at the DB level we only forbid same option twice)
  const secondOption = offsiteOptions[1];
  await db.insert(vote).values({
    pollId: offsite.id,
    optionId: secondOption.id,
    voterToken: probeToken,
  });
  console.log(`✓ same token, different option — accepted (single-choice gating is app-layer, per spec)`);

  // 5. Signed-in duplicate path — fake a user_id and confirm its partial unique index trips too
  const fakeUserId = "00000000-0000-0000-0000-000000000001";
  await db.insert(vote).values({
    pollId: offsite.id,
    optionId: firstOption.id,
    userId: fakeUserId,
  });
  let userDuplicateRejected = false;
  try {
    await db.insert(vote).values({
      pollId: offsite.id,
      optionId: firstOption.id,
      userId: fakeUserId,
    });
  } catch (err) {
    userDuplicateRejected = true;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`✓ duplicate signed-in vote rejected — ${msg.split("\n")[0]}`);
  }
  if (!userDuplicateRejected) throw new Error("EXPECTED duplicate user vote to fail");

  // 6. Clean up the probe rows so re-running stays idempotent
  await db.delete(vote).where(eq(vote.voterToken, probeToken));
  await db
    .delete(vote)
    .where(and(eq(vote.pollId, offsite.id), eq(vote.userId, fakeUserId)));

  // 7. Confirm counts are still sane
  const allVotes = await db.query.vote.findMany();
  const allPolls = await db.query.poll.findMany();
  const allOptions = await db.query.pollOption.findMany();
  console.log(
    `\nFinal state: ${allPolls.length} polls, ${allOptions.length} options, ${allVotes.length} votes`,
  );

  console.log("\nM1 acceptance check: PASS");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nM1 acceptance check: FAIL");
    console.error(err);
    process.exit(1);
  });
