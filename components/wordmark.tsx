import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 font-display text-[22px] font-extrabold tracking-tight",
        className,
      )}
    >
      <span
        aria-hidden
        className="relative block h-[26px] w-[26px] flex-none -rotate-[8deg] bg-primary"
        style={{ borderRadius: "62% 38% 58% 42% / 60% 55% 45% 40%" }}
      >
        <span
          aria-hidden
          className="absolute left-[7.5px] top-[9px] block h-[3.5px] w-[3.5px] rounded-full bg-surface shadow-[7px_0_0_var(--surface)]"
        />
        <span
          aria-hidden
          className="absolute left-[9px] top-[13.5px] block h-[4px] w-[7px] rounded-b-[7px] border-b-2 border-mark"
        />
      </span>
      PollPotato
    </div>
  );
}
