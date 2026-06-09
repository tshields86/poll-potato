import { and, eq, isNull } from "drizzle-orm";
import { db, poll, vote } from "./db";

export type ClaimResult = {
  pollsClaimed: number;
  votesClaimed: number;
};

type Tokens = {
  voterToken?: string;
  creatorToken?: string;
};

/**
 * Idempotently transfers prior anonymous polls (matching `creatorToken`) and
 * votes (matching `voterToken`) onto the given `userId`. The `is null` guards
 * make repeat calls safe — once a row is claimed it can't be re-claimed.
 */
export async function claimAnonymousFor(
  userId: string,
  { voterToken, creatorToken }: Tokens,
): Promise<ClaimResult> {
  let pollsClaimed = 0;
  let votesClaimed = 0;

  if (creatorToken) {
    const updated = await db
      .update(poll)
      .set({ creatorUserId: userId })
      .where(
        and(eq(poll.creatorToken, creatorToken), isNull(poll.creatorUserId)),
      )
      .returning({ id: poll.id });
    pollsClaimed = updated.length;
  }

  if (voterToken) {
    const updated = await db
      .update(vote)
      .set({ userId })
      .where(and(eq(vote.voterToken, voterToken), isNull(vote.userId)))
      .returning({ id: vote.id });
    votesClaimed = updated.length;
  }

  return { pollsClaimed, votesClaimed };
}
