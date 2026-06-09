import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-[13px] border-2 border-line bg-paper px-4 py-3 text-base font-semibold text-ink placeholder:text-ink-soft placeholder:font-medium focus:outline-none focus-visible:border-primary",
          className,
        )}
        {...props}
      />
    );
  },
);
