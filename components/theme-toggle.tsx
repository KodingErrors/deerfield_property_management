"use client";

import { useEffect, useState } from "react";
import { applyTheme, currentTheme, hasStoredTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  // The server cannot know the visitor's theme; render the light-mode control and sync
  // after mount, once the inline boot script has stamped the root element.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(currentTheme());
    const media = matchMedia("(prefers-color-scheme: dark)");
    const follow = (event: MediaQueryListEvent) => {
      if (hasStoredTheme()) return;
      const next: Theme = event.matches ? "dark" : "light";
      applyTheme(next, false);
      setTheme(next);
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  const dark = theme === "dark";
  const label = dark ? "Use light mode" : "Use dark mode";

  return (
    <button
      className="theme-toggle"
      id="theme-toggle"
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const next: Theme = dark ? "light" : "dark";
        applyTheme(next);
        setTheme(next);
      }}
    >
      <span aria-hidden="true" id="theme-icon">{dark ? "☀" : "◐"}</span>
    </button>
  );
}
