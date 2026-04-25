"use client";

import { MoonIcon } from "@/components/svg/Moon";
import { SunIcon } from "@/components/svg/Sun";
import { useTheme } from "@/hooks/use-theme";

const iconButton =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[var(--text2)] transition-colors hover:bg-[var(--bg3)]";

export function ThemeToggle() {
  const [isDark, toggle] = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className={iconButton}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
    </button>
  );
}
