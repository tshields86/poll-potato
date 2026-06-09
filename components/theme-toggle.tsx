"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const subscribe = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Light" : "Dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${label.toLowerCase()} mode`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-primary"
      suppressHydrationWarning
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" aria-hidden />
        ) : (
          <Moon className="h-4 w-4" aria-hidden />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden />
      )}
      <span suppressHydrationWarning>{label}</span>
    </button>
  );
}
