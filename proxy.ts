import { NextResponse, type NextRequest } from "next/server";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const ANON_COOKIES = ["pp_voter_token", "pp_creator_token"] as const;

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  for (const name of ANON_COOKIES) {
    if (!request.cookies.get(name)) {
      response.cookies.set({
        name,
        value: crypto.randomUUID(),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: ONE_YEAR_SECONDS,
      });
    }
  }
  return response;
}

export const config = {
  // Run on every page and route handler except Next internals and the auth API
  // (Neon Auth's API has its own cookie semantics; we don't need to touch them).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
