import Link from "next/link";

export default function AppHome() {
  return (
    <section className="mx-auto max-w-3xl px-[clamp(18px,5vw,56px)] py-12">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Ready when you are.
      </h1>
      <p className="mt-3 text-ink-soft">
        Spin up a poll, share the link, watch the votes roll in.
      </p>
      <Link
        href="/app/create"
        className="mt-6 inline-flex items-center rounded-[14px] bg-primary px-6 py-3.5 font-display text-base font-bold text-primary-foreground transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
      >
        New poll
      </Link>
    </section>
  );
}
