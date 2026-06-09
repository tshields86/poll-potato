"use server";

import { getIdentity } from "./identity";
import { claimAnonymousFor, type ClaimResult } from "./identity-claim";

/**
 * Attach polls and votes from the caller's anonymous cookies to their
 * Neon Auth user id. Called from sign-up / sign-in form success handlers
 * and from the /auth/callback page after OAuth redirects.
 */
export async function claimAnonymousIdentity(): Promise<ClaimResult> {
  const identity = await getIdentity();
  if (identity.kind !== "user") {
    return { pollsClaimed: 0, votesClaimed: 0 };
  }
  return claimAnonymousFor(identity.userId, identity);
}
