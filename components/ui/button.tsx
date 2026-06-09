import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  fullWidth?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 font-display font-bold transition-[filter,transform,border-color,background] active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground rounded-[14px] py-3.5 px-6 text-base hover:-translate-y-px hover:brightness-110",
  outline:
    "rounded-[14px] py-3 px-5 text-sm border-2 border-line text-ink bg-surface hover:border-primary",
  ghost:
    "rounded-full py-2.5 px-4 text-sm border border-line text-ink bg-paper hover:border-primary",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", fullWidth, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], fullWidth && "w-full", className)}
      {...props}
    />
  );
});
