// Theme persistence. The choice is stored under the same key the previous site used, so
// returning visitors keep their setting. THEME_BOOT runs inline in <head> before paint
// (see app/layout.tsx) so a dark-mode visitor never sees a cream flash.
export const THEME_KEY = "deerfield-theme";

export type Theme = "light" | "dark";

export const THEME_COLORS: Record<Theme, string> = { light: "#fbfcfa", dark: "#101410" };

export const THEME_BOOT = `(() => {
  try {
    const saved = localStorage.getItem(${JSON.stringify(THEME_KEY)});
    const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch {}
})();`;

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }
}

export function hasStoredTheme(): boolean {
  try {
    return Boolean(localStorage.getItem(THEME_KEY));
  } catch {
    return false;
  }
}
