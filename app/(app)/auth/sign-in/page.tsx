import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { GoogleButton } from "@/components/auth/google-button";
import { SignInForm } from "@/components/auth/sign-in-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in · PollPotato",
};

export default async function SignInPage() {
  const { data } = await auth.getSession();
  if (data?.user) redirect("/app");

  return (
    <div className="w-full max-w-[400px] rounded-3xl border border-line bg-surface p-7 shadow-[0_24px_50px_-28px_rgb(33_27_78_/_0.12)]">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Sign in to see your polls and pick up where you left off.
      </p>

      <div className="mt-6">
        <GoogleButton />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <SignInForm callbackURL="/app" />

      <p className="mt-6 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link
          href="/auth/sign-up"
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
