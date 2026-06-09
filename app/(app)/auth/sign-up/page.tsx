import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { GoogleButton } from "@/components/auth/google-button";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create your account · PollPotato",
};

export default async function SignUpPage() {
  const { data } = await auth.getSession();
  if (data?.user) redirect("/app");

  return (
    <div className="w-full max-w-[400px] rounded-3xl border border-line bg-surface p-7 shadow-[0_24px_50px_-28px_rgb(33_27_78_/_0.12)]">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Make it official.
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Sign up to keep your polls, see who voted, and run polls people can&apos;t
        cheat on.
      </p>

      <div className="mt-6">
        <GoogleButton />
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.08em] text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <SignUpForm callbackURL="/app" />

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link
          href="/auth/sign-in"
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
