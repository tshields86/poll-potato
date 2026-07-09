import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl) {
  throw new Error("NEON_AUTH_BASE_URL is not set. See .env.example.");
}
if (!cookieSecret || cookieSecret.length < 32) {
  throw new Error(
    "NEON_AUTH_COOKIE_SECRET must be set to a string of 32+ characters.",
  );
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    // Share the session cookie across pollpotato.com and app.pollpotato.com.
    // Without this, signing up on the marketing host leaves the user
    // "signed out" on the app subdomain (where every actual flow lives).
    domain: process.env.NODE_ENV === "production" ? ".pollpotato.com" : undefined,
    // Neon Auth defaults to SameSite=Strict, which drops the session cookie on
    // any navigation arriving from another context — following a shared/poll
    // link, the OAuth return hop, or opening the app from Messages/email. The
    // result is a signed-in user rendered signed-out (no "My polls", votes not
    // recognized), most visibly on mobile. Lax still blocks cross-site POST
    // CSRF but sends the cookie on top-level link navigations, which is what a
    // session cookie needs.
    sameSite: "lax",
  },
});
