/**
 * Next.js edge middleware for Neon Auth's OAuth verifier exchange.
 *
 * Google sign-in lands back on `/auth/callback?neon_auth_session_verifier=…`
 * with a `neon-auth.session_challange` cookie. Neon Auth's middleware sees
 * that pair, calls the upstream `get-session` endpoint with the cookies,
 * and swaps in the real session cookie scoped to `.pollpotato.com`. Without
 * this middleware, the verifier never gets exchanged: the user reaches
 * `/app` with no session and the nav stays signed-out.
 *
 * Email/password works without this middleware because that POST is handled
 * inline by `auth.handler()` at `/api/auth/*` — only OAuth needs the
 * verifier-exchange step.
 *
 * Uses the legacy `middleware.ts` filename (edge runtime) rather than Next
 * 16's new `proxy.ts` (Node runtime) — OpenNext on Cloudflare Workers only
 * accepts edge middleware.
 *
 * The matcher is intentionally narrow: only the OAuth landing path. We
 * don't want this middleware enforcing auth on anonymous routes like
 * `/p/<slug>`, and limiting the matcher keeps that surface area zero.
 */
import { auth } from "@/lib/auth/server";

export default auth.middleware();

export const config = {
  matcher: ["/auth/callback"],
};
