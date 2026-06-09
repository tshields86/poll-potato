"use client";

import { cn } from "@/lib/utils";

type ToggleProps = {
  id?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export function Toggle({ id, checked, onChange, label, hint, disabled }: ToggleProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-4 py-1"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-xs font-medium text-ink-soft">
            {hint}
          </span>
        )}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[27px] w-[46px] flex-none rounded-full transition-colors disabled:opacity-60",
          checked ? "bg-primary" : "bg-bar-track",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] block h-[21px] w-[21px] rounded-full bg-white shadow-sm transition-[left]",
            checked ? "left-[22px]" : "left-[3px]",
          )}
        />
      </button>
    </label>
  );
}
