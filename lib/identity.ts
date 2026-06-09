import { cookies } from "next/headers";
import { auth } from "./auth/server";

export type Identity =
  | { kind: "user"; userId: string; voterToken?: string; creatorToken?: string }
  | { kind: "anonymous"; voterToken: string; creatorToken: string };

/**
 * Returns the active identity for the current request.
 * - Signed-in users: `kind: "user"` with their Neon Auth `user.id`. The anon
 *   cookies (if present from before sign-up) are returned alongside so callers
 *   can run a one-time claim of prior polls/votes.
 * - Anonymous users: `kind: "anonymous"` with the long-lived cookies that
 *   proxy.ts mints on first request.
 *
 * Throws if the anonymous cookies are unexpectedly missing — that would mean
 * proxy.ts didn't run, which is a configuration bug, not a user-facing error.
 */
export async function getIdentity(): Promise<Identity> {
  const session = await auth.getSession();
  const user = session.data?.user;
  const c = await cookies();
  const voterToken = c.get("pp_voter_token")?.value;
  const creatorToken = c.get("pp_creator_token")?.value;

  if (user) {
    return { kind: "user", userId: user.id, voterToken, creatorToken };
  }

  if (!voterToken || !creatorToken) {
    throw new Error(
      "Missing anonymous identity cookies — proxy.ts should have minted them.",
    );
  }
  return { kind: "anonymous", voterToken, creatorToken };
}
