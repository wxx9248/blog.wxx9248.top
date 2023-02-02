export const themes = ["dark", "light"] as const;
export type Theme = (typeof themes)[number];

export const themeStorageKey = "theme";
export const themeChangeEvent = "themechange";

export interface ThemeChangeDetail {
  theme: Theme;
}

/**
 * Applies a stored theme before first paint. Inlined into <head> as a string,
 * so it must not reference anything outside its own body.
 */
export function initTheme(storageKey: string): void {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "dark" || stored === "light") {
      document.documentElement.dataset.theme = stored;
    }
  } catch {
    // Storage can be blocked; the page then follows the system theme
  }
}

export function currentTheme(): Theme {
  const { theme } = document.documentElement.dataset;
  if (theme === "dark" || theme === "light") {
    return theme;
  }
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function toggleTheme(): Theme {
  const theme: Theme = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The choice then lasts only for this page
  }
  document.dispatchEvent(
    new CustomEvent<ThemeChangeDetail>(themeChangeEvent, {
      detail: { theme }
    })
  );
  return theme;
}
