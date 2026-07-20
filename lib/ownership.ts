/**
 * The single rule for "does this actor own this poll?"
 *
 * A poll can be owned two ways: by an account (`creator_user_id`) or, for polls
 * made without signing up, by the anonymous `pp_creator_token` cookie
 * (`creator_token`). Once a poll is claimed by an account, ownership is
 * account-only — the creator cookie no longer counts. That way signing out, a
 * different browser, or a stale cookie can't manage an account-owned poll;
 * losing the cookie doesn't lose a poll you actually have an account for.
 *
 * Only genuinely unclaimed polls (no `creator_user_id`) fall back to the cookie,
 * which preserves the no-sign-up flow: create a poll anonymously, keep managing
 * it from the same browser, and it transfers to your account when you sign in
 * (see `claimAnonymousPolls`).
 */
export function ownsPoll(
  poll: { creatorUserId: string | null; creatorToken: string | null },
  actor: { userId?: string | null; creatorToken?: string | null },
): boolean {
  if (poll.creatorUserId) {
    return !!actor.userId && poll.creatorUserId === actor.userId;
  }
  return !!actor.creatorToken && poll.creatorToken === actor.creatorToken;
}
