"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Use light mode" : "Use dark mode"}
      title={isDark ? "Use light mode" : "Use dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-card text-foreground transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {isDark ? (
        <Sun aria-hidden="true" size={19} strokeWidth={1.8} />
      ) : (
        <Moon aria-hidden="true" size={19} strokeWidth={1.8} />
      )}
    </button>
  );
}
