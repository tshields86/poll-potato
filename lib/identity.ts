import { cookies } from "next/headers";
import { auth } from "./auth/server";

export const VOTER_COOKIE = "pp_voter_token";
export const CREATOR_COOKIE = "pp_creator_token";

export type Identity =
  | {
      kind: "user";
      userId: string;
      voterToken?: string;
      creatorToken?: string;
    }
  | {
      kind: "anonymous";
      voterToken: string | undefined;
      creatorToken: string | undefined;
    };

/**
 * Returns the active identity for the current request.
 *
 * Anonymous cookies (`pp_voter_token`, `pp_creator_token`) are minted lazily
 * by server actions that need them (see `ensureAnonymousIdentity`) — they may
 * be absent on a first GET. Callers that *must* have a token (e.g. casting
 * a vote, creating a poll) should call `ensureAnonymousIdentity` first.
 */
export async function getIdentity(): Promise<Identity> {
  const session = await auth.getSession();
  const user = session.data?.user;
  const c = await cookies();
  const voterToken = c.get(VOTER_COOKIE)?.value;
  const creatorToken = c.get(CREATOR_COOKIE)?.value;

  if (user) {
    return { kind: "user", userId: user.id, voterToken, creatorToken };
  }
  return { kind: "anonymous", voterToken, creatorToken };
}
