"use server";

import { cookies } from "next/headers";
import { getIdentity, VOTER_COOKIE, CREATOR_COOKIE } from "./identity";
import { claimAnonymousFor, type ClaimResult } from "./identity-claim";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Ensures the caller has `pp_voter_token` and `pp_creator_token` cookies,
 * minting any that are missing. Call this from server actions that record
 * anonymous activity (voting, creating a poll) before reading identity.
 */
export async function ensureAnonymousIdentity(): Promise<{
  voterToken: string;
  creatorToken: string;
}> {
  const c = await cookies();
  let voterToken = c.get(VOTER_COOKIE)?.value;
  let creatorToken = c.get(CREATOR_COOKIE)?.value;

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    // Share across pollpotato.com and app.pollpotato.com so a visitor's
    // anonymous tokens carry between the marketing landing and the app
    // subdomain (and stay attached to the user post sign-in).
    domain: process.env.NODE_ENV === "production" ? ".pollpotato.com" : undefined,
  };

  if (!voterToken) {
    voterToken = crypto.randomUUID();
    c.set(VOTER_COOKIE, voterToken, cookieOptions);
  }
  if (!creatorToken) {
    creatorToken = crypto.randomUUID();
    c.set(CREATOR_COOKIE, creatorToken, cookieOptions);
  }
  return { voterToken, creatorToken };
}

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
