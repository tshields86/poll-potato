"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
};

export function OptionCard({ label, selected, onSelect, disabled }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-[16px] border-2 border-line bg-surface px-5 py-4 text-left text-base font-semibold transition-[border-color,background,transform] hover:-translate-y-px hover:border-primary disabled:pointer-events-none disabled:opacity-60",
        selected && "border-primary bg-primary-soft",
      )}
    >
      <span className="relative inline-block">
        {selected && (
          <span
            aria-hidden
            className="pointer-events-none absolute -left-[7px] -right-[9px] top-1/2 h-[1.14em] -translate-y-1/2 -rotate-[1.4deg] rounded-md bg-mark"
          />
        )}
        <span
          className={cn(
            "relative inline-block transition-colors",
            selected && "text-mark-ink",
          )}
        >
          {label}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "grid h-[22px] w-[22px] flex-none place-items-center rounded-full border-2",
          selected
            ? "border-primary bg-primary text-white"
            : "border-line",
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}
