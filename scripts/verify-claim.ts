import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { db, poll, pollOption, vote } from "../lib/db";
import { claimAnonymousFor } from "../lib/identity-claim";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Anonymous → user claim verification…\n");

  // Use the verify-bot user from an earlier sign-up smoke test.
  const users =
    (await sql`select id from neon_auth.user where email = 'verify-bot+m2@pollpotato.test'`) as {
      id: string;
    }[];
  if (users.length === 0) {
    console.log("(verify-bot user missing — sign up via the form first, then re-run)");
    process.exit(1);
  }
  const userId = users[0].id;
  console.log(`Using user_id: ${userId.slice(0, 8)}…`);

  const creatorToken = `claim-creator-${Date.now()}`;
  const voterToken = `claim-voter-${Date.now()}`;

  // Plant: an anonymous poll owned by creatorToken + an anonymous vote by voterToken
  const [planted] = await db
    .insert(poll)
    .values({
      slug: `claim-${Date.now()}`,
      question: "Claim-flow probe",
      creatorToken,
    })
    .returning();
  const [option] = await db
    .insert(pollOption)
    .values({ pollId: planted.id, label: "yes", position: 0 })
    .returning();
  const [plantedVote] = await db
    .insert(vote)
    .values({ pollId: planted.id, optionId: option.id, voterToken })
    .returning();
  console.log(`✓ planted poll ${planted.id.slice(0, 8)}… and vote ${plantedVote.id.slice(0, 8)}…`);

  // First claim — should attach both
  const r1 = await claimAnonymousFor(userId, { voterToken, creatorToken });
  console.log(`✓ first claim: ${JSON.stringify(r1)}`);
  if (r1.pollsClaimed !== 1 || r1.votesClaimed !== 1) {
    throw new Error(`expected 1/1, got ${JSON.stringify(r1)}`);
  }

  // Confirm rows are attached
  const pollAfter = await db.query.poll.findFirst({ where: eq(poll.id, planted.id) });
  const voteAfter = await db.query.vote.findFirst({ where: eq(vote.id, plantedVote.id) });
  if (pollAfter?.creatorUserId !== userId) throw new Error("poll claim missed");
  if (voteAfter?.userId !== userId) throw new Error("vote claim missed");
  console.log("✓ poll.creator_user_id and vote.user_id now point at the user");

  // Idempotence — second claim is a no-op
  const r2 = await claimAnonymousFor(userId, { voterToken, creatorToken });
  console.log(`✓ second claim is no-op: ${JSON.stringify(r2)}`);
  if (r2.pollsClaimed !== 0 || r2.votesClaimed !== 0) {
    throw new Error(`expected 0/0 on re-claim, got ${JSON.stringify(r2)}`);
  }

  // Cleanup
  await db.delete(poll).where(eq(poll.id, planted.id));
  console.log("\nClaim acceptance check: PASS");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nClaim acceptance check: FAIL");
    console.error(err);
    process.exit(1);
  });
