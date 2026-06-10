import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

type SessionUser = {
  name?: string | null;
  email?: string | null;
};

const APP_URL = process.env.PP_APP_URL ?? "https://app.pollpotato.com";

/**
 * `crossHost` is set by the marketing layout (`pollpotato.com`) so the
 * Sign in / Sign up links use absolute URLs to `app.pollpotato.com`. That
 * triggers a real browser navigation through the Worker — the user lands
 * on the app subdomain where the auth cookie is scoped, all forms post to
 * an allowed Neon Auth origin, and the URL bar reflects the canonical
 * host split. From inside the (app) layout we stay on relative paths.
 */
export function UserMenu({
  user,
  crossHost = false,
}: {
  user: SessionUser | null;
  crossHost?: boolean;
}) {
  const signInHref = crossHost ? `${APP_URL}/auth/sign-in` : "/auth/sign-in";
  const signUpHref = crossHost ? `${APP_URL}/auth/sign-up` : "/auth/sign-up";

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href={signInHref}
          className="rounded-full border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary sm:px-4"
        >
          Sign in
        </Link>
        <Link
          href={signUpHref}
          className="hidden rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-[filter,transform] hover:-translate-y-px hover:brightness-110 sm:inline-flex"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm font-semibold text-ink-soft sm:inline">
        {user.name ?? user.email}
      </span>
      <SignOutButton />
    </div>
  );
}
