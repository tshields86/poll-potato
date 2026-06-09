import Link from "next/link";

export default function MarketingHome() {
  return (
    <section className="mx-auto max-w-3xl px-[clamp(18px,5vw,56px)] py-12">
      <h1 className="font-display text-[clamp(36px,6vw,56px)] font-extrabold leading-[1.02] tracking-tight">
        Settle it.{" "}
        <span className="rounded-lg bg-mark px-2 text-mark-ink">Fast.</span>
      </h1>
      <p className="mt-4 max-w-xl text-[17px] text-ink-soft">
        Spin up a poll in ten seconds, share one link, and watch the votes roll
        in. No sign-up, no fuss — just an answer.
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <Link
          href="/app/create"
          className="inline-flex items-center rounded-[14px] bg-primary px-6 py-3.5 font-display text-base font-bold text-primary-foreground transition-[filter,transform] hover:-translate-y-px hover:brightness-110"
        >
          Start a poll
        </Link>
        <span className="font-semibold text-ink-soft">
          or see an example →
        </span>
      </div>

      <div className="mt-12 rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_50px_-28px_rgb(var(--shadow))]">
        <p className="font-display text-lg font-extrabold">Tabs or spaces?</p>
        <div className="mt-4 space-y-3">
          <ResultRow name="Spaces" pct={61} win />
          <ResultRow name="Tabs" pct={39} />
        </div>
        <p className="mt-3 font-mono text-xs text-ink-soft">
          updating live · 1,204 votes
        </p>
      </div>

      <p className="mt-10 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
        M0 shell · fonts: <span className="font-display">Bricolage</span> ·{" "}
        <span className="font-sans">Hanken</span> ·{" "}
        <span className="font-mono">Space Mono</span>
      </p>
    </section>
  );
}

function ResultRow({
  name,
  pct,
  win,
}: {
  name: string;
  pct: number;
  win?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-semibold">{name}</span>
        <span className={`font-mono font-bold ${win ? "text-primary" : ""}`}>
          {pct}%
        </span>
      </div>
      <div className="h-7 overflow-hidden rounded-xl bg-bar-track">
        <div
          className="h-full rounded-xl bg-bar transition-[width] duration-1000 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
