import Link from "next/link";
import { auth } from "@/lib/auth/server";
import { SignOutButton } from "./sign-out-button";

export async function UserMenu() {
  const { data } = await auth.getSession();
  const user = data?.user;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/sign-in"
          className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary"
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
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
